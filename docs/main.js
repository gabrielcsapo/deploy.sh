let workBeingDone = [];

function print(install) {
  while(workBeingDone.length > 0) {
    let queued = workBeingDone.shift();
    clearInterval(queued);
  }
  document.querySelector('#install').innerHTML = '';

  let skipTill = 0;
  let letters = install.split("");
  let work = letters.map((c, i) => {
    // This is when we do look aheads
    if(i < skipTill) return;
    // This means that we need to output this like an application did so look ahead to the next \n and print that
    if(c === '✎') {
      let done = false;
      let escaped = letters.slice(i + 1).join('');
      let next = escaped.indexOf('✎') + 1;
      escaped = escaped.substr(0, next - 1);
      skipTill = i + 1 + next;

      return `<span style="color:#dedede;">${escaped}</span>`;
    } else {
      return c;
    }
    if(i === install.length - 1) {
      return '<span class="blinking-cursor">|</span>';
    }
  }).filter((w) => !!w);

  work.forEach((w, i) => {
    workBeingDone.push(setTimeout(() => {
      document.querySelector('#install').innerHTML += w;
    }, 100 * i));
  });
}

(function() {
  window.addEventListener('load', function() {
    let installs = {
      docker: " $ npm install deploy.sh -g \n $ ls \n ✎ Dockerfile server.go \n✎ $ deploy \n ✎  🚀☁️  ✎",
      node: " $ npm install deploy.sh -g \n $ ls \n ✎ package.json index.js \n✎ $ deploy \n ✎  🚀☁️  ✎",
      static: " $ npm install deploy.sh -g \n $ ls \n ✎ index.html logo.png \n✎ $ deploy \n ✎  🚀☁️  ✎"
    }

    print(installs['static']);

    document.querySelector('#node').onclick = function () { print(installs['node']) }
    document.querySelector('#static').onclick = function () { print(installs['static']) }
    document.querySelector('#docker').onclick = function () { print(installs['docker']) }
  });
}());
