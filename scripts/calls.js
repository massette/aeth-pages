const server = "localhost:3000";

function uploadMap(ev) {
  const file = ev.target.files[0]

  fetch(`${server}/api/files/images/${file.name}?userid=gamemaster`, {
    method: "POST",
    body: file,
  });
}
