// ==================== INISIALISASI CKEDITOR ====================
function initCKEditor() {
    // Cek apakah CKEditor sudah dimuat
    if (typeof ClassicEditor === 'undefined') {
        console.error('CKEditor tidak ditemukan. Periksa CDN.');
        return;
    }

    // Cek apakah elemen textarea ada
    var textarea = document.querySelector('#questionEditor');
    if (!textarea) {
        console.error('Textarea #questionEditor tidak ditemukan.');
        return;
    }

    // Hancurkan instance lama jika ada (untuk mencegah duplikasi)
    if (window.questionEditor) {
        window.questionEditor.destroy().then(function() {
            createEditorInstance();
        });
    } else {
        createEditorInstance();
    }
}

function createEditorInstance() {
    ClassicEditor
        .create(document.querySelector('#questionEditor'), {
            toolbar: [
                'heading', '|',
                'bold', 'italic', 'underline', 'strikethrough', '|',
                'bulletedList', 'numberedList', '|',
                'alignment', '|',
                'link', 'blockQuote', 'insertTable', 'mediaEmbed', '|',
                'undo', 'redo', '|',
                'math' // Tombol rumus
            ],
            math: {
                engine: 'mathjax',
                mathJaxUrl: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
            },
            language: 'id',
            placeholder: 'Tulis pertanyaan di sini...'
        })
        .then(function(editor) {
            window.questionEditor = editor;
            console.log('CKEditor berhasil diinisialisasi!');
            
            // Sinkronisasi konten ke textarea hidden
            editor.model.document.on('change:data', function() {
                var content = editor.getData();
                document.getElementById('questionInput').value = content;
            });
        })
        .catch(function(error) {
            console.error('Gagal inisialisasi CKEditor:', error);
        });
}

// ==================== MODAL TAMBAH SOAL ====================
function openAddQuestionModal() {
    var modal = document.getElementById('addQuestionModal');
    modal.style.display = 'flex';
    
    // Reset form
    document.getElementById('addQuestionForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('questionInput').value = '';
    
    // Inisialisasi CKEditor (dengan jeda agar modal benar-benar terbuka)
    setTimeout(function() {
        initCKEditor();
    }, 300);
}

function closeAddQuestionModal() {
    // Hancurkan instance editor saat modal ditutup
    if (window.questionEditor) {
        window.questionEditor.destroy().then(function() {
            window.questionEditor = null;
        });
    }
    document.getElementById('addQuestionModal').style.display = 'none';
}

// ==================== SAVE QUESTION ====================
function saveQuestion() {
    // Ambil konten dari CKEditor
    var questionText = '';
    if (window.questionEditor) {
        questionText = window.questionEditor.getData();
    } else {
        questionText = document.getElementById('questionInput').value || 'Pertanyaan baru';
    }
    
    var optionsRaw = document.getElementById('optionsInput').value;
    var correctAnswer = document.getElementById('correctAnswerInput').value;
    var category = document.getElementById('categoryInput').value;
    var imageUrl = document.getElementById('imageUrlInput').value;
    var latexFormula = document.getElementById('latexInput').value;
    
    // Validasi
    if (!optionsRaw) {
        alert('Masukkan opsi jawaban!');
        return;
    }
    
    var options = optionsRaw.split(',').map(function(s) { return s.trim(); });
    
    if (!correctAnswer) {
        alert('Masukkan jawaban benar!');
        return;
    }
    
    // Siapkan data
    var data = {
        action: 'saveQuestion',
        question: questionText,
        options: JSON.stringify(options),
        correctAnswer: correctAnswer,
        category: category,
        imageUrl: imageUrl,
        latexFormula: latexFormula
    };
    
    // Jika ada gambar yang diupload (base64)
    if (window.tempImageData) {
        // Kirim juga data gambar (implementasi sesuai backend)
        data.imageBase64 = window.tempImageData;
    }
    
    // Kirim ke server (sesuaikan dengan endpoint Anda)
    fetch(APP_CONFIG.API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(function(response) {
        alert('Soal berhasil disimpan!');
        closeAddQuestionModal();
        loadQuestions();
    })
    .catch(function(error) {
        console.error('Error:', error);
        alert('Gagal menyimpan soal. Silakan coba lagi.');
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Event listener untuk tombol tambah soal
    document.getElementById('addQuestionBtn').addEventListener('click', function() {
        openAddQuestionModal();
    });
    
    // Event listener untuk modal close
    document.querySelector('.close').addEventListener('click', function() {
        closeAddQuestionModal();
    });
    
    // Event listener untuk submit form
    document.getElementById('addQuestionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveQuestion();
    });
    
    // Event listener untuk upload gambar
    document.getElementById('imageUpload').addEventListener('change', function(e) {
        handleImageUpload(e);
    });
    
    // Load soal saat halaman dimuat
    loadQuestions();
});

// ==================== HANDLE IMAGE UPLOAD ====================
function handleImageUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(event) {
        var preview = document.getElementById('imagePreview');
        preview.innerHTML = '<img src="' + event.target.result + '" style="max-width:200px;max-height:200px;border-radius:8px;margin-top:10px;">';
        window.tempImageData = event.target.result;
    };
    reader.readAsDataURL(file);
}

// ==================== LOAD QUESTIONS (CONTOH) ====================
function loadQuestions() {
    var container = document.getElementById('questionsContainer');
    container.innerHTML = '<div class="loading">Memuat soal...</div>';
    
    // Panggil API untuk mendapatkan soal
    var url = APP_CONFIG.API_URL + '?action=getQuestions';
    
    fetch(url)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.status === 'success') {
                renderQuestions(data.data);
            } else {
                container.innerHTML = '<div class="empty-state"><h3>Gagal memuat soal</h3></div>';
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            container.innerHTML = '<div class="empty-state"><h3>Error</h3><p>Gagal terhubung ke server</p></div>';
        });
}

function renderQuestions(questions) {
    var container = document.getElementById('questionsContainer');
    if (!questions || questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Belum ada soal</h3></div>';
        return;
    }
    
    var html = '';
    questions.forEach(function(q, index) {
        html += '<div class="question-card">';
        html += '<div class="question-number">Soal #' + (index + 1) + '</div>';
        html += '<div class="question-text">' + q.question + '</div>';
        
        if (q.latexFormula) {
            html += '<div class="question-formula">\\(' + q.latexFormula + '\\)</div>';
        }
        
        if (q.imageUrl) {
            html += '<img src="' + q.imageUrl + '" class="question-image">';
        }
        
        if (q.options) {
            var options = JSON.parse(q.options);
            html += '<ul class="options-list">';
            options.forEach(function(option) {
                html += '<li>' + option + '</li>';
            });
            html += '</ul>';
        }
        
        html += '</div>';
    });
    
    container.innerHTML = html;
    
    // Render ulang MathJax
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
    }
}
