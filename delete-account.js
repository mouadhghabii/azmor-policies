import { webConfig } from './web-config.js';
import { createDeletionClient } from './deletion-client.js';

const copy = {
  en: {
    ready: 'Verify your account email to continue. Nothing is deleted until you confirm DELETE.',
    code_sent: 'If this email belongs to an existing account, a code has been requested. Check your inbox; you may need to wait before requesting another.',
    verified: 'Email verified. Review the deletion limits, then confirm only if you want permanent deletion.',
    finalized: 'The server confirmed deletion of the account and its owned cloud records. Remove any remaining offline device copies separately.',
    purged: 'The server confirmed that account data was removed, but sign-in deletion is still pending. Verify the same email and retry in this browser.',
    working: 'Processing. Keep this page open until the result appears.',
    configuration: 'Web deletion is not active yet. The operator must finish the public service configuration before this form can be used.',
    storage: 'This browser cannot save the deletion recovery receipt. Allow local website storage and try again. Do not clear a pending receipt.',
    coordination: 'This browser cannot safely coordinate deletion between tabs. Use a current browser with Web Locks support. Keep any pending recovery receipt.',
    recovery: 'This browser has no valid recovery receipt. Do not assume an earlier request completed; use the verified account controls or contact the operator.',
    owner: 'This browser has a pending deletion for a different account. Verify the original account; do not clear its recovery receipt.',
    email: 'Enter the email address of your existing AZMOR account.', code: 'Enter the six-digit code from the latest email.',
    confirmation: 'Type DELETE exactly and acknowledge permanent deletion.', verification: 'Verify the same account email again before deleting.',
    rate: 'Too many requests. Wait and try again later.', network: 'The network response is uncertain. Keep this page and check deletion status before retrying.',
    unknown: 'No matching completed receipt was found. This does not confirm deletion. Verify the same email and retry.',
    conflict: 'Another deletion operation already exists for this account. Continue it on the original device/browser or contact the operator for verified recovery.',
    pending: 'Account data is removed but sign-in deletion is not yet confirmed. Keep this page and retry with the same verified email.',
    unavailable: 'The service could not confirm this request. Keep any recovery receipt, verify the same email and try again later.',
    completed_storage: 'The server confirmed deletion, but this browser could not remove its local recovery receipt. You may now remove this site’s stored data.',
  },
  fr: {
    ready: 'Vérifiez l’e-mail du compte pour continuer. Aucune suppression avant votre confirmation DELETE.',
    code_sent: 'Si cet e-mail correspond à un compte existant, un code a été demandé. Consultez votre boîte et attendez avant une nouvelle demande.',
    verified: 'E-mail vérifié. Relisez les limites et confirmez uniquement si vous souhaitez une suppression définitive.',
    finalized: 'Le serveur a confirmé la suppression du compte et de ses données cloud. Effacez séparément les copies hors ligne restantes.',
    purged: 'Les données du compte sont supprimées, mais la suppression de connexion reste en attente. Vérifiez le même e-mail et réessayez dans ce navigateur.',
    working: 'Traitement en cours. Gardez cette page ouverte jusqu’au résultat.',
    configuration: 'La suppression web n’est pas encore active. Le responsable doit terminer la configuration publique avant utilisation.',
    storage: 'Le navigateur ne peut pas sauvegarder le reçu de reprise. Autorisez le stockage local. N’effacez pas un reçu en attente.',
    coordination: 'Ce navigateur ne peut pas coordonner la suppression entre les onglets. Utilisez un navigateur récent compatible avec Web Locks. Conservez tout reçu en attente.',
    recovery: 'Aucun reçu de reprise valide ici. Ne supposez pas qu’une demande précédente est terminée ; utilisez les contrôles vérifiés ou contactez le responsable.',
    owner: 'Une suppression d’un autre compte est en attente ici. Vérifiez le compte initial sans effacer son reçu.',
    email: 'Saisissez l’e-mail de votre compte AZMOR existant.', code: 'Saisissez les six chiffres du dernier e-mail.',
    confirmation: 'Tapez exactement DELETE et acceptez la suppression définitive.', verification: 'Vérifiez à nouveau l’e-mail du même compte avant suppression.',
    rate: 'Trop de demandes. Attendez puis réessayez.', network: 'Réponse réseau incertaine. Gardez cette page et vérifiez l’état avant de réessayer.',
    unknown: 'Aucun reçu correspondant confirmé. Cela ne prouve pas la suppression. Vérifiez le même e-mail et réessayez.',
    conflict: 'Une autre opération existe déjà. Reprenez sur l’appareil/navigateur initial ou contactez le responsable pour une reprise vérifiée.',
    pending: 'Données supprimées, connexion pas encore confirmée supprimée. Gardez cette page et réessayez avec le même e-mail vérifié.',
    unavailable: 'Le service ne peut pas confirmer la demande. Conservez le reçu, vérifiez le même e-mail et réessayez plus tard.',
    completed_storage: 'Le serveur confirme la suppression, mais le reçu local n’a pas été effacé. Vous pouvez maintenant effacer les données de ce site.',
  },
  ar: {
    ready: 'تحقّق من بريد حسابك للمتابعة. لا يُحذف شيء قبل تأكيدك بكلمة DELETE.',
    code_sent: 'إذا كان البريد لحساب موجود فقد طُلب رمز تحقق. راجع بريدك وانتظر قبل طلب رمز آخر.',
    verified: 'تم التحقق من البريد. راجع حدود الحذف وأكّد فقط إن أردت الحذف النهائي.',
    finalized: 'أكّد الخادم حذف الحساب وبياناته السحابية. احذف نسخ الجهاز غير المتصل المتبقية بصورة منفصلة.',
    purged: 'أكّد الخادم محو بيانات الحساب، لكن حذف هوية الدخول ما زال معلقًا. تحقّق من البريد نفسه وأعد المحاولة في المتصفح نفسه.',
    working: 'جارٍ التنفيذ. أبقِ الصفحة مفتوحة حتى تظهر النتيجة.',
    configuration: 'الحذف من الويب غير مفعّل بعد. يجب أن يكمل المسؤول إعداد الخدمة العامة قبل استخدام النموذج.',
    storage: 'تعذّر حفظ إيصال الاسترجاع في هذا المتصفح. اسمح بالتخزين المحلي وحاول مجددًا. لا تمحُ إيصالًا معلقًا.',
    coordination: 'لا يستطيع هذا المتصفح تنسيق الحذف بأمان بين علامات التبويب. استخدم متصفحًا حديثًا يدعم Web Locks واحتفظ بأي إيصال استرجاع معلّق.',
    recovery: 'لا يوجد إيصال استرجاع صالح هنا. لا تفترض اكتمال طلب سابق؛ استخدم إجراءات الحساب المتحقق منها أو اتصل بالمسؤول.',
    owner: 'يوجد طلب حذف معلق لحساب آخر في هذا المتصفح. تحقّق من الحساب الأصلي ولا تمحُ إيصال استرجاعه.',
    email: 'أدخل بريد حساب AZMOR الموجود.', code: 'أدخل الأرقام الستة من آخر رسالة تحقق.',
    confirmation: 'اكتب DELETE كما هي وأقرّ بفهم الحذف النهائي.', verification: 'تحقّق مجددًا من بريد الحساب نفسه قبل الحذف.',
    rate: 'الطلبات كثيرة. انتظر وحاول لاحقًا.', network: 'نتيجة الاتصال غير مؤكدة. أبقِ الصفحة وتحقّق من حالة الحذف قبل الإعادة.',
    unknown: 'لم يوجد إيصال مطابق يؤكد الإكمال. هذا لا يثبت الحذف. تحقّق من البريد نفسه وأعد المحاولة.',
    conflict: 'توجد عملية حذف أخرى لهذا الحساب. أكملها في الجهاز أو المتصفح الأصلي أو اتصل بالمسؤول لاسترجاع متحقق منه.',
    pending: 'مُحيت بيانات الحساب ولم يتأكد حذف الدخول. أبقِ الصفحة وحاول بالبريد نفسه بعد التحقق.',
    unavailable: 'تعذّر تأكيد الطلب. احتفظ بالإيصال وتحقّق من البريد نفسه وحاول لاحقًا.',
    completed_storage: 'أكّد الخادم الحذف، لكن المتصفح لم يمحُ إيصال الاسترجاع. يمكنك الآن إزالة بيانات هذا الموقع المحلية.',
  },
};
const text = copy[document.documentElement.lang] ?? copy.en;
const status = document.getElementById('deletion-status');
const emailForm = document.getElementById('email-form');
const codeForm = document.getElementById('code-form');
const deleteForm = document.getElementById('delete-form');
const check = document.getElementById('check-status');
let client, busy = false;
const show = key => { status.textContent = text[key] ?? text.unavailable; };
const refreshRecovery = () => { try { check.hidden = !client.hasRecovery(); } catch (error) { show(error.code); } };
const run = async action => {
  if (busy) return;
  busy = true; show('working');
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try {
    const result = await action(); show(result);
    if (result === 'code_sent') { codeForm.hidden = false; deleteForm.hidden = true; document.getElementById('code').focus(); }
    if (result === 'verified') { deleteForm.hidden = false; document.getElementById('confirmation').focus(); }
    if (result === 'finalized') { emailForm.hidden = true; codeForm.hidden = true; deleteForm.hidden = true; }
  } catch (error) { show(error.code); }
  finally { busy = false; document.querySelectorAll('button').forEach(button => { button.disabled = false; }); refreshRecovery(); }
};
try { client = createDeletionClient(webConfig); show('ready'); refreshRecovery(); }
catch (error) { show(error.code); document.querySelectorAll('form, #check-status').forEach(element => { element.hidden = true; }); }
emailForm.addEventListener('submit', event => { event.preventDefault(); run(() => client.sendCode(document.getElementById('email').value)); });
codeForm.addEventListener('submit', event => { event.preventDefault(); run(() => client.verifyCode(document.getElementById('code').value)); });
deleteForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!document.getElementById('acknowledge').checked) { show('confirmation'); return; }
  run(() => client.deleteAccount(document.getElementById('confirmation').value));
});
check.addEventListener('click', () => run(() => client.checkStatus()));
