const card = document.querySelector('.card');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');

let words = []; // Kelimeleri saklamak için boş bir dizi
let currentWordIndex = 0;

function readExcelFile(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    words = jsonData.map((row) => ({
      word: row['Word'],
      translation: row['Translation'],
      pronunciation: row['Pronunciation'],
    }));

    showWord();
  };

  reader.readAsArrayBuffer(file);
}

function showWord() {
  const currentWord = words[currentWordIndex];
  const wordElement = document.querySelector('.word');
  const translationElement = document.querySelector('.translation');

  wordElement.textContent = currentWord.word;
  wordElement.dataset.pronunciation = currentWord.pronunciation;
  translationElement.textContent = currentWord.translation;

  card.classList.remove('flipped');
}

nextButton.addEventListener('click', () => {
  currentWordIndex = (currentWordIndex + 1) % words.length;
  card.classList.add('flip');
  setTimeout(() => {
    showWord();
    card.classList.remove('flip');
  }, 500);
});

prevButton.addEventListener('click', () => {
  currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
  card.classList.add('flip');
  setTimeout(() => {
    showWord();
    card.classList.remove('flip');
  }, 500);
});

card.addEventListener('click', () => {
  card.classList.toggle('flipped');
});

// Dosya seçildiğinde okunacak olay dinleyicisi
document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  readExcelFile(file);
});
