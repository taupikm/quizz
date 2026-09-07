// app.js - Aplikasi Soal

// ==================== STATE ====================
var state = {
    questions: [],
    currentPage: 1,
    pageSize: 10,
    totalPages: 0,
    category: 'all',
    selectedAnswers: {}
};

// ==================== INISIALISASI ====================
document.addEventListener('DOMContentLoaded', function() {
    loadQuestions();
    
    // Event listener untuk filter kategori
    document.getElementById('categoryFilter').addEventListener('change', function() {
        state.category = this.value;
        state.currentPage = 1;
        loadQuestions();
    });
    
    // Event listener untuk tombol muat ulang
    document.getElementById('loadQuestionsBtn').addEventListener('click', function() {
        loadQuestions();
    });
    
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
    
    // Inisialisasi Quill Editor
    initQuillEditor();
    
    // Event listener untuk upload gambar
    document.getElementById('imageUpload').addEventListener('change', function(e) {
        handleImageUpload(e);
    });
});

// ==================== LOAD QUESTIONS ====================
function loadQuestions() {
    var container = document.getElementById('questionsContainer');
    container.innerHTML = '<div class="loading">Memuat soal...</div>';
    
    var url = APP_CONFIG.API_URL + 
        '?action=getQuestions' +
        '&page=' + state.currentPage +
        '&limit=' + state.pageSize +
        '&category=' + state.category;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                state.questions = data.data;
                state.totalPages = data.pagination.totalPages;
                renderQuestions(data.data);
            } else {
                container.innerHTML = '<div class="empty-state"><h3>Gagal memuat soal</h3><p>' + data.message + '</p></div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            container.innerHTML = '<div class="empty-state"><h3>Error</h3><p>Gagal terhubung ke server</p></div>';
        });
}

// ==================== RENDER QUESTIONS ====================
function renderQuestions(questions) {
    var container = document.getElementById('questionsContainer');
    
    if (!questions || questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Belum ada soal</h3><p>Klik "Tambah Soal" untuk menambahkan soal baru</p></div>';
        return;
    }
    
    var html = '';
    
    questions.forEach(function(q, index) {
        var questionNumber = (state.currentPage - 1) * state.pageSize + index + 1;
        
        html += '<div class="question-card" data-id="' + q.id + '">';
        html += '<div class="question-number">Soal #' + questionNumber + ' • ' + (q.category || 'Umum') + '</div>';
        
        // Pertanyaan (mendukung HTML)
        html += '<div class="question-text">' + q.question + '</div>';
        
        // Rumus matematika (LaTeX)
        if (q.latexFormula) {
            html += '<div class="question-formula">\\(' + q.latexFormula + '\\)</div>';
        }
        
        // Gambar
        if (q.imageUrl) {
            html += '<img src="' + q.imageUrl + '" class="question-image" alt="Gambar soal">';
        }
        
        // Opsi jawaban
        if (q.options) {
            var options = JSON.parse(q.options);
            html += '<ul class="options-list" data-question-id="' + q.id + '">';
            
            options.forEach(function(option, optIndex) {
                var letter = String.fromCharCode(65 + optIndex); // A, B, C, D
                var selected = state.selectedAnswers[q.id] === option ? 'selected' : '';
                
                html += '<li class="' + selected + '" data-question-id="' + q.id + '" data-answer="' + option + '">';
                html += '<strong>' + letter + '.</strong> ' + option;
                html += '</li>';
            });
            
            html += '</ul>';
            
            // Tombol cek jawaban
            html += '<button class="btn-secondary check-answer-btn" data-question-id="' + q.id + '" style="margin-top:10px;font-size:12px;">Cek Jawaban</button>';
            html += ' <span class="feedback" id="feedback-' + q.id + '"></span>';
        }
        
        html += '</div>';
    });
    
    container.innerHTML = html;
    
    // Event listener untuk pilihan jawaban
    document.querySelectorAll('.options-list li').forEach(function(el) {
        el.addEventListener('click', function() {
            var questionId = this.dataset.questionId;
            var answer = this.dataset.answer;
            
            // Hapus selection sebelumnya
            document.querySelectorAll('.options-list li[data-question-id="' + questionId + '"]').forEach(function(li) {
                li.classList.remove('selected');
            });
            
            this.classList.add('selected');
            state.selectedAnswers[questionId] = answer;
        });
    });
    
    // Event listener untuk tombol cek jawaban
    document.querySelectorAll('.check-answer-btn').forEach(function(el) {
        el.addEventListener('click', function() {
            var questionId = this.dataset.questionId;
            checkAnswer(questionId);
        });
    });
    
    // Render ulang MathJax
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
    }
}

// ==================== CEK JAWABAN ====================
function checkAnswer(questionId) {
    var selected = state.selectedAnswers[questionId];
    var feedback = document.getElementById('feedback-' + questionId);
    var question = state.questions.find(q => q.id === questionId);
    
    if (!selected) {
        feedback.innerHTML = '⚠️ Pilih jawaban terlebih dahulu!';
        feedback.style.color = '#f39c12';
        return;
    }
    
    if (!question) {
        feedback.innerHTML = '❌ Soal tidak ditemukan';
        feedback.style.color = '#e74c3c';
        return;
    }
    
    var isCorrect = selected === question.correctAnswer;
    
    // Highlight opsi
    document.querySelectorAll('.options-list li[data-question-id="' + questionId + '"]').forEach(function(li) {
        li.classList.remove('correct', 'wrong');
        if (li.dataset.answer === question.correctAnswer) {
            li.classList.add('correct');
        } else if (li.dataset.answer === selected && !isCorrect) {
            li.classList.add('wrong');
        }
    });
    
    if (isCorrect) {
        feedback.innerHTML = '✅ Jawaban benar! 🎉';
        feedback.style.color = '#28a745';
    } else {
        feedback.innerHTML = '❌ Jawaban salah. Jawaban benar: ' + question.correctAnswer;
        feedback.style.color = '#dc3545';
    }
}

// ==================== QUILL EDITOR ====================
function initTinyMCEEditor() {
    if (typeof tinymce !== 'undefined') {
        tinymce.init({
            selector: '#questionEditor',
            height: 300,
            menubar: true,
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount', 'mathslate'
            ],
            toolbar: 'undo redo | blocks | ' +
                'bold italic backcolor | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat | mathslate | help',
            mathslate: {
                // Konfigurasi Mathslate
                macros: {
                    "\\R": "\\mathbb{R}",
                    "\\N": "\\mathbb{N}",
                    "\\Z": "\\mathbb{Z}"
                }
            },
            setup: function(editor) {
                editor.on('change', function() {
                    // Sinkronisasi dengan hidden input
                    document.getElementById('questionInput').value = editor.getContent();
                });
            }
        });
    }
}

// Panggil di DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // ... kode lain
    initTinyMCEEditor();
    // ...
});        
        // Simpan referensi
        window.questionEditor = quill;
        
        // Sinkronisasi dengan textarea hidden
        quill.on('text-change', function() {
            var content = quill.root.innerHTML;
            document.getElementById('questionInput').value = content;
        });
    }
}

// ==================== MODAL TAMBAH SOAL ====================
function openAddQuestionModal() {
    var modal = document.getElementById('addQuestionModal');
    modal.style.display = 'flex';
    
    // Reset form
    document.getElementById('addQuestionForm').reset();
    if (window.questionEditor) {
        window.questionEditor.root.innerHTML = '';
    }
    document.getElementById('imagePreview').innerHTML = '';
}

function closeAddQuestionModal() {
    document.getElementById('addQuestionModal').style.display = 'none';
}

// ==================== HANDLE IMAGE UPLOAD ====================
function handleImageUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(event) {
        // Tampilkan preview
        var preview = document.getElementById('imagePreview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'imagePreview';
            document.getElementById('imageUpload').parentNode.appendChild(preview);
        }
        preview.innerHTML = '<img src="' + event.target.result + '" style="max-width:200px;max-height:200px;border-radius:8px;margin-top:10px;">';
        
        // Simpan base64 untuk diupload
        window.tempImageData = event.target.result;
    };
    reader.readAsDataURL(file);
}

// ==================== SAVE QUESTION ====================
function saveQuestion() {
    var questionText = document.getElementById('questionInput').value || 'Pertanyaan baru';
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
    
    var options = optionsRaw.split(',').map(s => s.trim());
    
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
    
    // Jika ada gambar yang diupload, upload dulu
    if (window.tempImageData) {
        // Upload gambar via API
        var imageData = window.tempImageData;
        // Kirim ke server untuk upload
        // Catatan: Karena GAS tidak support FormData, kita kirim base64
        // Data akan disimpan sebagai URL di spreadsheet
    }
    
    // Kirim ke server
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
