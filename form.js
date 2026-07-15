/**
 * form.js
 * Lógica do Formulário de Envio de Homenagens (form.html)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Variável para armazenar a imagem comprimida em Base64
    let uploadedPhotoBase64 = '';

    // Inicializa efeitos decorativos
    initHeartsBackground();
    initFormHandlers();

    // 1. SISTEMA DE PARTÍCULAS (CORAÇÕES FLUTUANTES)
    function initHeartsBackground() {
        const container = document.getElementById('hearts-container');
        if (!container) return;

        const icons = ['❤️', '💖', '✨', '🌸', '💕'];
        
        function createHeart() {
            const heart = document.createElement('div');
            heart.classList.add('heart-particle');
            heart.innerText = icons[Math.floor(Math.random() * icons.length)];
            heart.style.left = Math.random() * 100 + 'vw';
            
            const size = Math.random() * 1.2 + 0.6;
            heart.style.fontSize = size + 'rem';
            
            const duration = Math.random() * 6 + 7;
            heart.style.animationDuration = duration + 's';
            
            if (size < 0.9) {
                heart.style.filter = 'blur(1px)';
                heart.style.opacity = '0.3';
            } else {
                heart.style.opacity = '0.6';
            }

            container.appendChild(heart);

            setTimeout(() => {
                heart.remove();
            }, duration * 1000);
        }

        setInterval(createHeart, 1000);
    }

    // 2. LOGICA DO FORMULÁRIO E IMAGENS
    function initFormHandlers() {
        const form = document.getElementById('tribute-form');
        const fileInput = document.getElementById('guest-photo');
        const dropZone = document.getElementById('drop-zone');
        const previewContainer = document.getElementById('photo-preview-container');
        const previewImg = document.getElementById('photo-preview');
        const removePhotoBtn = document.getElementById('btn-remove-photo');
        
        const formContent = document.getElementById('form-content');
        const successContent = document.getElementById('success-content');
        const btnSendAnother = document.getElementById('btn-send-another');

        if (!form) return;

        // Clique na área de upload ativa o seletor de arquivos
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Eventos de Drag & Drop
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--gold)';
                dropZone.style.background = 'rgba(183, 110, 121, 0.1)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--border-glass)';
                dropZone.style.background = 'rgba(0, 0, 0, 0.2)';
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        // Evento de seleção de arquivo
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // Processa e comprime a imagem
        function handleFile(file) {
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione apenas arquivos de imagem.');
                return;
            }

            // Exibir carregador visual básico (opcional)
            dropZone.style.opacity = '0.5';

            compressImage(file, (base64Result) => {
                uploadedPhotoBase64 = base64Result;
                previewImg.src = base64Result;
                previewContainer.style.display = 'block';
                dropZone.style.display = 'none'; // oculta zona de upload
                dropZone.style.opacity = '1';
            });
        }

        // Compressor de imagem usando Canvas do HTML5
        function compressImage(file, callback) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    
                    // Resoluções máximas ideais para LocalStorage
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converte para JPEG com 70% de qualidade
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    callback(compressedBase64);
                };
            };
        }

        // Remover foto selecionada
        removePhotoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            uploadedPhotoBase64 = '';
            previewImg.src = '';
            previewContainer.style.display = 'none';
            dropZone.style.display = 'block';
        });

        // Envio do formulário
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('guest-name').value.trim();
            const message = document.getElementById('guest-message').value.trim();
            
            // Pega a relação ativa do radio button
            const relationRadio = document.querySelector('input[name="relation"]:checked');
            const relation = relationRadio ? relationRadio.value : 'amigo';

            // Validação simples
            if (!name || !message) {
                alert('Por favor, preencha o seu nome e deixe uma mensagem.');
                return;
            }

            // Adiciona no LocalStorage através das funções do database.js
            addTribute(name, relation, message, uploadedPhotoBase64);

            // Animação de Sucesso
            formContent.style.display = 'none';
            successContent.style.display = 'block';
            successContent.classList.add('active'); // ativa a animação do avião
        });

        // Enviar outra homenagem
        btnSendAnother.addEventListener('click', () => {
            // Resetar formulário
            form.reset();
            fileInput.value = '';
            uploadedPhotoBase64 = '';
            previewImg.src = '';
            previewContainer.style.display = 'none';
            dropZone.style.display = 'block';
            
            // Voltar telas
            successContent.classList.remove('active');
            successContent.style.display = 'none';
            formContent.style.display = 'block';
        });
    }
});
