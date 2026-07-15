/**
 * form.js
 * Lógica do Formulário de Envio de Homenagens (Fase 2)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado da mídia carregada
    let uploadedFileBlob = null;
    let uploadedFileType = 'none'; // 'image', 'audio', 'video', 'none'
    let previewUrl = ''; // Armazena a URL temporária da prévia para limpeza

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

    // 2. LÓGICA DO FORMULÁRIO E MÍDIAS (IMAGEM, ÁUDIO E VÍDEO)
    function initFormHandlers() {
        const form = document.getElementById('tribute-form');
        const fileInput = document.getElementById('guest-media');
        const dropZone = document.getElementById('drop-zone');
        
        // Contêineres de prévia
        const previewContainer = document.getElementById('media-preview-container');
        const photoPreview = document.getElementById('photo-preview');
        const videoPreview = document.getElementById('video-preview');
        const audioPreview = document.getElementById('audio-preview');
        const removeMediaBtn = document.getElementById('btn-remove-media');
        
        const formContent = document.getElementById('form-content');
        const successContent = document.getElementById('success-content');
        const btnSendAnother = document.getElementById('btn-send-another');

        if (!form) return;

        // Clique na zona de upload abre o seletor nativo
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Efeitos visuais de Drag & Drop
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

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // Valida e processa o arquivo carregado
        function handleFile(file) {
            // Oculta prévias anteriores e limpa memória
            clearMediaPreviews();
            
            dropZone.style.opacity = '0.5';

            if (file.type.startsWith('image/')) {
                // Processamento de Imagem com compressão Canvas
                compressImage(file, (compressedBlob) => {
                    uploadedFileBlob = compressedBlob;
                    uploadedFileType = 'image';
                    
                    previewUrl = URL.createObjectURL(compressedBlob);
                    photoPreview.src = previewUrl;
                    photoPreview.style.display = 'block';
                    
                    showPreviewContainer();
                });
            } else if (file.type.startsWith('video/')) {
                // Limita vídeo em 40MB para otimizar IndexedDB
                if (file.size > 40 * 1024 * 1024) {
                    alert('O vídeo selecionado é muito grande. Escolha um vídeo de até 40MB.');
                    dropZone.style.opacity = '1';
                    return;
                }

                uploadedFileBlob = file;
                uploadedFileType = 'video';
                
                previewUrl = URL.createObjectURL(file);
                videoPreview.src = previewUrl;
                videoPreview.style.display = 'block';
                
                showPreviewContainer();
            } else if (file.type.startsWith('audio/')) {
                // Limita áudio em 15MB
                if (file.size > 15 * 1024 * 1024) {
                    alert('O áudio selecionado é muito grande. Escolha um áudio de até 15MB.');
                    dropZone.style.opacity = '1';
                    return;
                }

                uploadedFileBlob = file;
                uploadedFileType = 'audio';
                
                previewUrl = URL.createObjectURL(file);
                audioPreview.src = previewUrl;
                audioPreview.style.display = 'block';
                
                showPreviewContainer();
            } else {
                alert('Formato de arquivo não suportado. Envie uma foto, áudio ou vídeo.');
                dropZone.style.opacity = '1';
            }
        }

        // Mostra a área de prévia
        function showPreviewContainer() {
            previewContainer.style.display = 'block';
            dropZone.style.display = 'none'; // oculta zona de upload
            dropZone.style.opacity = '1';
        }

        // Limpa as visualizações de mídia para liberação de memória
        function clearMediaPreviews() {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                previewUrl = '';
            }
            
            photoPreview.src = '';
            photoPreview.style.display = 'none';
            
            videoPreview.src = '';
            videoPreview.style.display = 'none';
            
            audioPreview.src = '';
            audioPreview.style.display = 'none';
        }

        // Compressor de imagem usando Canvas do HTML5 (retorna um Blob compacto)
        function compressImage(file, callback) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    
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

                    // Converte de volta para Blob
                    canvas.toBlob((blob) => {
                        callback(blob);
                    }, 'image/jpeg', 0.7); // Qualidade 70% JPEG
                };
            };
        }

        // Clique para remover a mídia selecionada
        removeMediaBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            uploadedFileBlob = null;
            uploadedFileType = 'none';
            
            clearMediaPreviews();
            previewContainer.style.display = 'none';
            dropZone.style.display = 'block';
        });

        // Envio do formulário (integração assíncrona com IndexedDB)
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('guest-name').value.trim();
            const message = document.getElementById('guest-message').value.trim();
            
            const relationRadio = document.querySelector('input[name="relation"]:checked');
            const relation = relationRadio ? relationRadio.value : 'amigo';

            if (!name || !message) {
                alert('Por favor, digite seu nome e uma mensagem de carinho.');
                return;
            }

            // Desativa botão de envio para evitar cliques múltiplos
            const submitBtn = document.getElementById('btn-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            // Salva no banco de dados IndexedDB
            addTribute(name, relation, message, uploadedFileBlob, uploadedFileType)
                .then(() => {
                    // Limpeza de mídia
                    clearMediaPreviews();
                    
                    // Transição para tela de sucesso
                    formContent.style.display = 'none';
                    successContent.style.display = 'block';
                    successContent.classList.add('active'); // ativa aviãozinho
                })
                .catch(err => {
                    console.error("Erro ao salvar recado:", err);
                    alert("Não foi possível enviar sua homenagem. Tente novamente.");
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Homenagem';
                });
        });

        // Enviar outra homenagem
        btnSendAnother.addEventListener('click', () => {
            form.reset();
            fileInput.value = '';
            uploadedFileBlob = null;
            uploadedFileType = 'none';
            
            clearMediaPreviews();
            previewContainer.style.display = 'none';
            dropZone.style.display = 'block';
            
            successContent.classList.remove('active');
            successContent.style.display = 'none';
            formContent.style.display = 'block';
        });
    }
});
