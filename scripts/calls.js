function uploadMap(ev) {
  const file = ev.target.files[0];
  const parts = file.name.split();
  parts.pop();

  fetch(`/api/files/images/${parts.join('.')}?userid=gamemaster`, {
    method: "POST",
    body: file,
  });
}
