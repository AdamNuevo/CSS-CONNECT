const MAX_IMAGE = 2 * 1024 * 1024;

// Reads an image file into a data URL, or rejects with a message that is safe to show the user.
export function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    if (file.size > MAX_IMAGE) return reject(new Error("Image is larger than 2 MB."));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}
