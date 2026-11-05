// Static responsive reference selection only; no game state or spending.
function selectSize(){const key=innerWidth<=320?'320x568':innerHeight<=650?'390x650':'390x844';for(const e of document.querySelectorAll('[data-size]'))e.hidden=e.dataset.size!==key;}
selectSize();addEventListener('resize',selectSize);
