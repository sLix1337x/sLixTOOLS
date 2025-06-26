console.log('Test script loaded!');
document.addEventListener('DOMContentLoaded', () => {
  const testDiv = document.createElement('div');
  testDiv.innerHTML = '<h1>Testing Page Load</h1><p>If you can see this, static assets are loading correctly.</p>';
  testDiv.style.position = 'fixed';
  testDiv.style.top = '20px';
  testDiv.style.left = '20px';
  testDiv.style.backgroundColor = 'white';
  testDiv.style.border = '2px solid black';
  testDiv.style.padding = '20px';
  testDiv.style.zIndex = '1000';
  document.body.appendChild(testDiv);
});
