// https://stackoverflow.com/a/2450976
function shuffle(array) {
  let currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // while there remain elements to shuffle...
  while (0 !== currentIndex) {
    // pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // and swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

module.exports = {
  // sort both sides on send_to_out-/inbound, descending, attempt here is to
  // match the biggest (unbalanced) channels to each other
  size(channels) {
    channels.outbound.sort((a, b) => b.send_to_outbound - a.send_to_outbound);
    channels.inbound.sort((a, b) => b.send_to_inbound - a.send_to_inbound);
  },

  // sort both sides by shuffling, to try new routes and matching peers
  shuffle(channels) {
    shuffle(channels.outbound);
    shuffle(channels.inbound);
  },
};
