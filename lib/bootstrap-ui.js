'use client';

/** Remove leftover Bootstrap overlays that gray out the UI and block form input. */
export function clearBootstrapOverlays() {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach((el) => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');

  document.querySelectorAll('.modal.show').forEach((el) => {
    el.classList.remove('show');
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    el.removeAttribute('aria-modal');
    el.removeAttribute('role');
  });

  document.querySelectorAll('.offcanvas.show').forEach((el) => {
    el.classList.remove('show');
    el.style.visibility = '';
  });
}

function cleanupOrphanBackdrops() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('.modal.show')) return;
  document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
}

export async function getBootstrap() {
  const mod = await import('bootstrap/dist/js/bootstrap.bundle.min.js');
  return mod.default || mod;
}

export async function showModal(id) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;
  const bootstrap = await getBootstrap();
  // Drop duplicate backdrops before opening
  document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove());
  const instance = bootstrap.Modal.getOrCreateInstance(el, { backdrop: true, focus: true, keyboard: true });
  instance.show();
}

export async function hideModal(id) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;
  const bootstrap = await getBootstrap();
  const instance = bootstrap.Modal.getInstance(el) || bootstrap.Modal.getOrCreateInstance(el);

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('hidden.bs.modal', finish);
      resolve();
    };
    el.addEventListener('hidden.bs.modal', finish);
    instance.hide();
    window.setTimeout(finish, 500);
  });

  cleanupOrphanBackdrops();
}

export async function hideOffcanvas(id) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;
  const bootstrap = await getBootstrap();
  const instance = bootstrap.Offcanvas.getInstance(el);
  if (instance) instance.hide();
  window.setTimeout(() => {
    if (!document.querySelector('.offcanvas.show')) {
      document.querySelectorAll('.offcanvas-backdrop').forEach((node) => node.remove());
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    }
  }, 320);
}
