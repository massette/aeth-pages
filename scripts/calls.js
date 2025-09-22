async function mapFormSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('map-input');
    const formData = new FormData();
    if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    } else {
        return;
    }
    const file = fileInput.files[0];
    const parts = file.name.split('.');
    parts.pop();
    try {
        const response = await fetch(`/api/files/images/${parts.join('.')}?userid=gamemaster`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        console.log("Upload successful:", result);
    } catch (err) {
        console.log("Upload failed: ", err);
    }
}