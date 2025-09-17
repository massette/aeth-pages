export class Map {
  image = new Image();
  width;
  height;

  constructor() {
    this.image.onload = (ev) => {
      this.width = this.image.naturalWidth;
      this.height = this.image.naturalHeight;
    }

    // TODO: query server for current map image
    const filename = "/images/maps/camp.png";
    // TODO: grid?

    this.image.src = filename;
  }

  // TODO: query for image updates
}
