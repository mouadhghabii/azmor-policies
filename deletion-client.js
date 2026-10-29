const receiptKey = 'azmor-web-deletion-v2';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const proofPattern = /^[A-Za-z0-9_-]{43}$/;
export class DeletionError extends Error {
  constructor(code) { super(code); this.code = code; }
}

/** No account creation, cookies, telemetry, SDK, external script or stored login token. */
export function createDeletionClient(config, { fetchImpl = fetch, storage = localStorage, cryptoImpl = crypto, lockManager = globalThis.navigator?.locks, now = Date.now } = {}) {
  if (config.supabaseUrl !== 'https://mmhspuuuxyhvukejuzps.supabase.co' ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) throw new DeletionError('configuration');
  const base = config.supabaseUrl;
  let accessToken = null, ownerId = null, verifiedAt = 0, pendingEmail = '', busy = false;
  const read = () => {
    let text;
    try { text = storage.getItem(receiptKey); } catch { throw new DeletionError('storage'); }
    if (!text) return null;
    try {
      const receipt = JSON.parse(text);
      if (receipt.protocolVersion !== 2 || !uuid.test(receipt.operationId) || !uuid.test(receipt.ownerId) || !proofPattern.test(receipt.recoveryProof) || !['requested', 'purged'].includes(receipt.phase)) throw new Error();
      return receipt;
    } catch { throw new DeletionError('recovery'); }
  };
  const persist = receipt => {
    try {
      const serialized = JSON.stringify(receipt);
      storage.setItem(receiptKey, serialized);
      if (storage.getItem(receiptKey) !== serialized) throw new Error();
    } catch { throw new DeletionError('storage'); }
  };
  const request = async (path, body, authenticated = false) => {
    let response;
    try {
      response = await fetchImpl(base + path, { method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { apikey: config.publishableKey, 'content-type': 'application/json', ...(authenticated ? { authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
    } catch { throw new DeletionError('network'); }
    let data;
    try { data = await response.json(); } catch { throw new DeletionError('network'); }
    if (!response.ok) {
      const code = data?.error?.code ?? data?.error_code;
      if (response.status === 429) throw new DeletionError('rate');
      if (code === 'deletion_operation_conflict') throw new DeletionError('conflict');
      if (code === 'deletion_receipt_not_found') throw new DeletionError('unknown');
      throw new DeletionError(authenticated && response.status === 401 ? 'verification' : 'unavailable');
    }
    return data;
  };
  const exclusive = async action => {
    if (busy) throw new DeletionError('busy');
    busy = true;
    try { return await action(); } finally { busy = false; }
  };
  const recoveryExclusive = async action => {
    if (typeof lockManager?.request !== 'function') throw new DeletionError('coordination');
    let acquired = false;
    try {
      return await lockManager.request(receiptKey, { mode: 'exclusive' }, async lock => {
        if (!lock) throw new DeletionError('coordination');
        acquired = true;
        return action();
      });
    } catch (error) {
      if (acquired) throw error;
      throw new DeletionError('coordination');
    }
  };
  const complete = () => {
    accessToken = null; ownerId = null; pendingEmail = ''; verifiedAt = 0;
    try { storage.removeItem(receiptKey); if (storage.getItem(receiptKey) !== null) throw new Error(); }
    catch { throw new DeletionError('completed_storage'); }
    return 'finalized';
  };
  const status = async receipt => {
    const result = await request('/functions/v1/azmor-delete-status', { operationId: receipt.operationId, recoveryProof: receipt.recoveryProof });
    if (result.operationId !== receipt.operationId || !['purged', 'finalized'].includes(result.status)) throw new DeletionError('unavailable');
    return result.status;
  };
  return {
    hasRecovery: () => read() !== null,
    sendCode: email => exclusive(async () => {
      accessToken = null; ownerId = null; verifiedAt = 0;
      pendingEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingEmail) || pendingEmail.length > 254) throw new DeletionError('email');
      await request('/auth/v1/otp', { email: pendingEmail, create_user: false });
      return 'code_sent';
    }),
    verifyCode: code => exclusive(async () => {
      accessToken = null; ownerId = null; verifiedAt = 0;
      if (!pendingEmail || !/^\d{6}$/.test(code.trim())) throw new DeletionError('code');
      const data = await request('/auth/v1/verify', { email: pendingEmail, token: code.trim(), type: 'email' });
      if (typeof data.access_token !== 'string' || !data.access_token || !uuid.test(data.user?.id) || !data.user?.email_confirmed_at || data.user?.email?.toLowerCase() !== pendingEmail.toLowerCase()) throw new DeletionError('verification');
      const receipt = read();
      if (receipt && receipt.ownerId !== data.user.id) throw new DeletionError('owner');
      accessToken = data.access_token; ownerId = data.user.id; verifiedAt = now();
      return 'verified';
    }),
    checkStatus: () => exclusive(() => recoveryExclusive(async () => {
      const receipt = read();
      if (!receipt) throw new DeletionError('recovery');
      return await status(receipt) === 'finalized' ? complete() : 'purged';
    })),
    deleteAccount: confirmation => exclusive(() => recoveryExclusive(async () => {
      if (confirmation !== 'DELETE') throw new DeletionError('confirmation');
      if (!accessToken || !ownerId || now() - verifiedAt > 600000) throw new DeletionError('verification');
      let receipt = read();
      if (receipt && receipt.ownerId !== ownerId) throw new DeletionError('owner');
      if (receipt) {
        try {
          const current = await status(receipt);
          if (current === 'finalized') return complete();
          receipt.phase = 'purged'; persist(receipt);
        } catch (error) {
          if (!(error instanceof DeletionError) || error.code !== 'unknown' || receipt.phase !== 'requested') throw error;
        }
      } else {
        const bytes = cryptoImpl.getRandomValues(new Uint8Array(32));
        const recoveryProof = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        receipt = { protocolVersion: 2, operationId: cryptoImpl.randomUUID(), recoveryProof, ownerId, phase: 'requested' };
        persist(receipt);
      }
      if (receipt.phase === 'requested') {
        const prepared = await request('/functions/v1/azmor-api/v1/account/delete/prepare', {
          confirmation: 'DELETE', protocolVersion: 2, operationId: receipt.operationId, recoveryProof: receipt.recoveryProof,
        }, true);
        if (prepared.status !== 'purged' || prepared.operationId !== receipt.operationId || prepared.userId !== ownerId) throw new DeletionError('unavailable');
        receipt.phase = 'purged'; persist(receipt);
      }
      try {
        const finalized = await request('/functions/v1/azmor-api/v1/account/delete/finalize', { protocolVersion: 2, operationId: receipt.operationId }, true);
        if (finalized.status !== 'finalized' || finalized.operationId !== receipt.operationId) throw new DeletionError('unavailable');
      } catch {
        // Lost responses and an already deleted Auth identity are never interpreted as completion.
        if (await status(receipt) !== 'finalized') throw new DeletionError('pending');
      }
      return complete();
    })),
  };
}
