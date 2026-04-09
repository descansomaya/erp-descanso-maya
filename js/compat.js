window.App = window.App || {};
App.compat = App.compat || {};

App.compat.init = function () {
  if (!App.config?.ui?.enableCompatStyles) return;

  document.querySelectorAll('.btn').forEach(el => {
    if (!el.classList.contains('dm-btn')) el.classList.add('dm-btn');
  });

  document.querySelectorAll('.btn-primary').forEach(el => {
    if (!el.classList.contains('dm-btn-primary')) el.classList.add('dm-btn-primary');
  });

  document.querySelectorAll('.btn-secondary').forEach(el => {
    if (!el.classList.contains('dm-btn-secondary')) el.classList.add('dm-btn-secondary');
  });

  document.querySelectorAll('.card').forEach(el => {
    if (!el.classList.contains('dm-card')) el.classList.add('dm-card');
  });

  document.querySelectorAll('.form-group').forEach(el => {
    if (!el.classList.contains('dm-form-group')) el.classList.add('dm-form-group');
  });
};
