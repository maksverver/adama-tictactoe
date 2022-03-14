'use strict';

const globalClickTargets = createClickTargets();

function getWinningLines(board, player) {
  const lines = [
    // Horizontal
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // Vertical
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // Diagonal
    [0, 4, 8],
    [2, 4, 6],
  ];
  return lines.filter(function(line) {
    for (let i of line) {
      if (board[i] !== player) return false;
    }
    return true;
  });
}

function removeChildren(elem) {
  while (elem.lastChild) elem.removeChild(elem.lastChild);
}

function createClickTargets() {
  const clickTargets = [];
  let container = document.getElementById('clickTargets');
  for (let y = 0; y < 3; ++y) {
    for (let x = 0; x < 3; ++x) {
      let use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('x', x);
      use.setAttribute('y', y);
      use.setAttribute('href', '#click-target');
      container.appendChild(use);
      clickTargets.push(use);
    }
  }
  return Object.freeze(clickTargets);
}

function reset(board, winner, moveEnabled, lastMove) {
  let marks = document.getElementById('marks');
  removeChildren(marks);
  for (let i = 0; i < board.length; ++i) {
    let x = i%3;
    let y = (i - x)/3;
    if (board[i] != 0) {
      let use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', board[i] > 0 ? '#mark-x' : '#mark-o');
      let g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.appendChild(use);
      g.setAttribute('transform', 'translate(' + x + ',' + y + ')');
      if (i === lastMove) {
        g.classList.add('last-move');
      }
      marks.appendChild(g);
    }
    globalClickTargets[i].setAttribute('display', moveEnabled && board[i] == 0 ? 'block' : 'none');
  }

  if (winner) {
    for (let winningLine of getWinningLines(board, winner)) {
      let x1 = winningLine[0]%3;
      let y1 = (winningLine[0] - x1)/3;
      let x2 = winningLine[1]%3;
      let y2 = (winningLine[1] - x2)/3;
      let x3 = winningLine[2]%3;
      let y3 = (winningLine[2] - x3)/3;

      let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x2 + (x1 - x2)*1.4);
      line.setAttribute('y1', y2 + (y1 - y2)*1.4);
      line.setAttribute('x2', x2 + (x3 - x2)*1.4);
      line.setAttribute('y2', y2 + (y3 - y2)*1.4);
      line.classList.add('winning-stroke');
      marks.appendChild(line);
    }
  }
}

const space = 'mv_tictactoe';

// Don't hardcode this.
const key = prompt('Document key');

// Don't hardcode this.
const identity = prompt('User identity');

const connection = new Adama.Connection(Adama.Production);
connection.start();
connection.wait_connected().then(function() {
  console.info('Connected to Adama!');

  const state = {
    board: [0, 0, 0, 0, 0, 0, 0, 0],
    nextPlayer: 0,
    winner: 0,
    lastMove: null,
  };

  function update() {
    reset(state.board, state.winner, /* moveEnabled = */ state.nextPlayer != 0, state.lastMove);
  }

  function setBoard(i, value, oldValue) {
    if (state.board[i] != value) {
      state.board[i] = value;
      if (oldValue != null) {
        state.lastMove = i;
      }
      update();
    }
  }

  function setNextPlayer(p) {
    console.info(`Next player: ${playerName(p)}`);
    if (state.nextPlayer != p) {
      state.nextPlayer = p;
      update();
    }
  }

  function setWinner(p) {
    console.info(`Winner: ${playerName(p)}`);
    if (state.winner != p) {
      state.winner = p;
      update();
    }
  }

  function playerName(id) {
    return id === 1 ? 'X' : id === -1 ? 'O' : id === 0 ? 'nobody' : `invalid (${id})`;
  }

  const tree = new Adama.Tree();
  tree.onTreeChange({
    board0: c => setBoard(0, c.value, c.before),
    board1: c => setBoard(1, c.value, c.before),
    board2: c => setBoard(2, c.value, c.before),
    board3: c => setBoard(3, c.value, c.before),
    board4: c => setBoard(4, c.value, c.before),
    board5: c => setBoard(5, c.value, c.before),
    board6: c => setBoard(6, c.value, c.before),
    board7: c => setBoard(7, c.value, c.before),
    board8: c => setBoard(8, c.value, c.before),
    nextPlayer: c => setNextPlayer(c.value),
    winner: c => setWinner(c.value),
  });

  const connection1 = connection.ConnectionCreate(
    identity, space, key, /* viewerState? */ {}, new Adama.TreePipeDataResponse(tree));

  globalClickTargets.forEach((elem, i) => elem.addEventListener('click', () => connection1.send('execute', {pos: i})));
});
