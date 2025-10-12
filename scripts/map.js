let map = {
  image: new Image(),
  width: 0,
  height: 0,
}
const stages = [];

map.register = function(stage) {
  stages.push(stage);

  // force initial update
  stage.render();
}

map.image.addEventListener("load", function(ev) {
  map.width = map.image.naturalWidth;
  map.height = map.image.naturalHeight;

  for (const stage of stages) {
    // TODO: allow handling map change downstream
    for (let i = stage.layers.length - 1; i >= 0; i--) {
      if (stage.layers[i].updateMap)
        stage.layers[i].updateMap(map)
    }

    stage.render();
  }
});

  // TODO: fetch active map from server
map.image.src = "/api/files/images/maps/camp";

export default map;
