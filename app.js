/**
 * app.js
 * Lógica principal do Mural de Homenagens da Suellen (Fase 2)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configurações e Imagens locais da Suellen
    const SUELLEN_IMAGES = [
        'S.jpeg',
        'D.jpeg',
        'IMG-20241225-WA0000.jpg',
        'IMG_20250103_224512.jpg',
        'WhatsApp Image 2026-07-15 at 10.45.38.jpeg',
        'WhatsApp Image 2026-07-15 at 10.45.38F.jpeg',
        'WhatsApp Image 2026-07-15 at 10.45.39F.jpeg'
    ];

    // Senha padrão do Painel Administrador
    const ADMIN_PASSWORD = 'suellen19';

    // Helper para escapar HTML (Prevenção de XSS)
    function escapeHTML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 1. INICIALIZAR COMPONENTES
    initHeartsBackground();
    initHeroSlider(SUELLEN_IMAGES);
    initCountdown();
    initAudioPlayer();
    initQRcode();
    initMural('all');
    initAdminPanel();
    initSecretLetter();
    checkPendingBadge(); // Verifica homenagens pendentes periodicamente

    // 2. SISTEMA DE PARTÍCULAS (CORAÇÕES FLUTUANTES)
    function initHeartsBackground() {
        const container = document.getElementById('hearts-container');
        if (!container) return;

        const icons = ['❤️', '💖', '✨', '🌸', '💕'];
        
        function createHeart() {
            const heart = document.createElement('div');
            heart.classList.add('heart-particle');
            
            heart.innerText = icons[Math.floor(Math.random() * icons.length)];
            heart.style.left = Math.random() * 100 + 'vw';
            
            const size = Math.random() * 1.5 + 0.8;
            heart.style.fontSize = size + 'rem';
            
            const duration = Math.random() * 6 + 7;
            heart.style.animationDuration = duration + 's';
            
            if (size < 1.2) {
                heart.style.filter = 'blur(1px)';
                heart.style.opacity = '0.4';
            } else {
                heart.style.opacity = '0.7';
            }

            container.appendChild(heart);

            setTimeout(() => {
                heart.remove();
            }, duration * 1000);
        }

        setInterval(createHeart, 800);
    }

    // 3. HERO SLIDESHOW BACKGROUND
    function initHeroSlider(images) {
        const slider = document.getElementById('hero-slider');
        if (!slider) return;

        images.forEach((imgSrc, index) => {
            const slide = document.createElement('div');
            slide.classList.add('slide');
            if (index === 0) slide.classList.add('active');
            
            const encodedSrc = imgSrc.replace(/ /g, '%20');
            slide.style.backgroundImage = `url("${encodedSrc}")`;
            slider.appendChild(slide);
        });

        let currentSlide = 0;
        const slides = slider.querySelectorAll('.slide');
        
        if (slides.length > 0) {
            setInterval(() => {
                slides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add('active');
            }, 5000);
        }
    }

    // 4. CRONÔMETRO REGRESSIVO DO CABEÇALHO (19/07/2026)
    function initCountdown() {
        const targetDate = new Date('2026-07-19T00:00:00').getTime();

        function updateTimer() {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference <= 0) {
                document.getElementById('countdown').innerHTML = `
                    <div style="font-family: var(--font-cursive); font-size: 3.5rem; color: var(--gold); text-shadow: 0 0 10px var(--gold);">
                        Feliz Aniversário, Suellen! 🎂🎉
                    </div>
                `;
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            document.getElementById('days').innerText = String(days).padStart(2, '0');
            document.getElementById('hours').innerText = String(hours).padStart(2, '0');
            document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
            document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
        }

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    // 5. PLAYER DE MÚSICA DE FUNDO
    function initAudioPlayer() {
        const player = document.getElementById('audio-player');
        const audio = document.getElementById('bg-music');
        const btn = document.getElementById('audio-btn');
        const icon = document.getElementById('audio-icon');
        const artistText = player.querySelector('.audio-artist');

        if (!audio || !btn) return;

        // Volume máximo
        audio.volume = 1.0;

        const playOnFirstInteraction = () => {
            audio.volume = 1.0;
            audio.play().then(() => {
                player.classList.add('playing');
                icon.className = 'fas fa-pause';
                artistText.innerText = 'Tocando agora';
                document.removeEventListener('click', playOnFirstInteraction);
            }).catch(err => {
                console.log("Autoplay bloqueado aguardando clique direto.");
            });
        };
        
        document.addEventListener('click', playOnFirstInteraction);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (audio.paused) {
                audio.volume = 1.0;
                audio.play();
                player.classList.add('playing');
                icon.className = 'fas fa-pause';
                artistText.innerText = 'Tocando agora';
            } else {
                audio.pause();
                player.classList.remove('playing');
                icon.className = 'fas fa-play';
                artistText.innerText = 'Pausado';
            }
        });
    }

    // 6. RENDERIZAÇÃO E FILTRAGEM DO MURAL (INDEXEDB ASSÍNCRONO)
    function initMural(filter = 'all') {
        const grid = document.getElementById('mural-grid');
        const galleryGrid = document.getElementById('gallery-grid');
        if (!grid) return;

        // Limpa mural anterior
        grid.innerHTML = '';

        // Carrega assincronamente as homenagens do IndexedDB
        getTributes().then(tributes => {
            const filteredTributes = filter === 'all' 
                ? tributes 
                : tributes.filter(t => t.relation === filter);

            if (filteredTributes.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="far fa-envelope-open" style="font-size: 3rem; margin-bottom: 15px; color: var(--rose-gold-light);"></i>
                        <p>Nenhuma homenagem cadastrada nesta categoria ainda. Seja o primeiro!</p>
                    </div>
                `;
            } else {
                filteredTributes.forEach(tribute => {
                    const card = document.createElement('div');
                    card.classList.add('tribute-card');
                    card.setAttribute('data-id', tribute.id);
                    card.addEventListener('click', () => openTributeModal(tribute));

                    // Determina o indicador visual de mídia no cabeçalho
                    let mediaIndicator = '';
                    let photoHtml = '';

                    if (tribute.media && tribute.mediaType === 'image') {
                        const mediaUrl = URL.createObjectURL(tribute.media);
                        photoHtml = `<img class="tribute-card-photo" src="${mediaUrl}" alt="Foto de ${tribute.name}">`;
                        mediaIndicator = `<span class="tribute-media-indicator" title="Possui Foto"><i class="fas fa-image"></i></span>`;
                    } else if (tribute.media && tribute.mediaType === 'audio') {
                        mediaIndicator = `<span class="tribute-media-indicator" title="Mensagem de Voz"><i class="fas fa-microphone"></i></span>`;
                    } else if (tribute.media && tribute.mediaType === 'video') {
                        mediaIndicator = `<span class="tribute-media-indicator" title="Mensagem em Vídeo"><i class="fas fa-video"></i></span>`;
                    }

                    const relationText = tribute.relation === 'familia' ? 'Família' : tribute.relation === 'amigo' ? 'Amigo(a)' : 'Convidado';
                    const relationClass = `relation-${tribute.relation}`;

                    card.innerHTML = `
                        ${photoHtml}
                        <div class="tribute-header">
                            <span class="tribute-sender">${escapeHTML(tribute.name)} ${mediaIndicator}</span>
                            <span class="tribute-relation ${relationClass}">${relationText}</span>
                        </div>
                        <p class="tribute-text">"${escapeHTML(tribute.message)}"</p>
                        <div class="tribute-footer">
                            <span><i class="far fa-calendar-alt"></i> ${tribute.date}</span>
                            <span class="tribute-readmore">Ler carta <i class="fas fa-arrow-right"></i></span>
                        </div>
                    `;

                    grid.appendChild(card);
                });
            }

            // Renderiza também a Galeria de Fotos
            if (galleryGrid) {
                galleryGrid.innerHTML = '';
                const galleryPhotos = [];
                
                // Adiciona as fotos originais da pasta local
                SUELLEN_IMAGES.forEach((img, idx) => {
                    galleryPhotos.push({
                        src: img,
                        caption: `Momento Especial ${idx + 1}`
                    });
                });

                // Adiciona fotos enviadas pelos convidados via formulário
                tributes.forEach(t => {
                    if (t.media && t.mediaType === 'image') {
                        galleryPhotos.push({
                            src: URL.createObjectURL(t.media),
                            caption: `Enviada por ${t.name}`
                        });
                    }
                });

                galleryPhotos.forEach(photo => {
                    const item = document.createElement('div');
                    item.classList.add('gallery-item');
                    item.innerHTML = `
                        <img src="${photo.src}" alt="${photo.caption}">
                        <div class="gallery-overlay">
                            <div class="gallery-caption">${photo.caption}</div>
                        </div>
                    `;
                    
                    item.addEventListener('click', () => {
                        openPhotoModal(photo.src, photo.caption);
                    });

                    galleryGrid.appendChild(item);
                });
            }
        });

        // Configurar Eventos dos Filtros
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.onclick = (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                initMural(btn.getAttribute('data-filter'));
            };
        });
    }

    // 7. MODAIS (LEITURA DE CARTA E VISUALIZADOR DE FOTOS COM REPRODUTORES DE MÍDIA)
    const modal = document.getElementById('tribute-modal');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');

    function openTributeModal(tribute) {
        if (!modal) return;
        
        document.getElementById('modal-sender').innerText = tribute.name;
        document.getElementById('modal-date').innerText = tribute.date;
        document.getElementById('modal-message').innerText = tribute.message;
        
        const modalPhoto = document.getElementById('modal-photo');
        const videoContainer = document.getElementById('modal-video-container');
        const videoPlayer = document.getElementById('modal-video');
        const audioContainer = document.getElementById('modal-audio-container');
        const audioPlayer = document.getElementById('modal-audio');

        // Resetar players de mídia e previews
        modalPhoto.style.display = 'none';
        videoContainer.style.display = 'none';
        videoPlayer.src = '';
        audioContainer.style.display = 'none';
        audioPlayer.src = '';

        // Carrega a mídia de acordo com o tipo
        if (tribute.media) {
            const mediaUrl = URL.createObjectURL(tribute.media);
            
            if (tribute.mediaType === 'image') {
                modalPhoto.src = mediaUrl;
                modalPhoto.style.display = 'block';
            } else if (tribute.mediaType === 'video') {
                videoPlayer.src = mediaUrl;
                videoContainer.style.display = 'block';
            } else if (tribute.mediaType === 'audio') {
                audioPlayer.src = mediaUrl;
                audioContainer.style.display = 'block';
            }
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Disparar chuva de confetes romântica
        triggerConfettiRain();
    }

    function openPhotoModal(imgSrc, caption) {
        if (!modal) return;
        
        document.getElementById('modal-sender').innerText = caption;
        document.getElementById('modal-date').innerText = '';
        document.getElementById('modal-message').innerText = '';
        
        const modalPhoto = document.getElementById('modal-photo');
        const videoContainer = document.getElementById('modal-video-container');
        const audioContainer = document.getElementById('modal-audio-container');

        modalPhoto.src = imgSrc;
        modalPhoto.style.display = 'block';
        videoContainer.style.display = 'none';
        audioContainer.style.display = 'none';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modal) return;
        
        // Para a reprodução de áudios/vídeos do modal ao fechar
        const videoPlayer = document.getElementById('modal-video');
        const audioPlayer = document.getElementById('modal-audio');
        if (videoPlayer) videoPlayer.pause();
        if (audioPlayer) audioPlayer.pause();

        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    // 8. CHUVA DE CONFETES DE CORAÇÃO E BRILHOS (ROSE GOLD)
    function triggerConfettiRain() {
        const colors = ['#b76e79', '#f2e2a2', '#e59fa9', '#FAF6F0'];
        
        for (let i = 0; i < 40; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            
            // Variabilidade visual
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 8 + 6 + 'px';
            confetti.style.height = confetti.style.width;
            
            // Randomiza animação e atraso
            const delay = Math.random() * 0.8;
            confetti.style.animationDelay = delay + 's';
            
            const duration = Math.random() * 2 + 2; // 2s a 4s
            confetti.style.animationDuration = duration + 's';
            
            document.body.appendChild(confetti);

            // Remove após a queda
            setTimeout(() => {
                confetti.remove();
            }, (duration + delay) * 1000);
        }
    }

    // 9. GERADOR AUTOMÁTICO DE QR CODE (CTA)
    function initQRcode() {
        const qrImg = document.getElementById('qr-code-img');
        if (!qrImg) return;

        const currentUrl = window.location.href;
        let formUrl = '';
        
        if (currentUrl.endsWith('index.html')) {
            formUrl = currentUrl.replace('index.html', 'form.html');
        } else if (currentUrl.endsWith('/')) {
            formUrl = currentUrl + 'form.html';
        } else {
            const lastSlash = currentUrl.lastIndexOf('/');
            formUrl = currentUrl.substring(0, lastSlash + 1) + 'form.html';
        }

        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(formUrl)}`;
    }

    // 10. CRONÔMETRO E DESTRANCAR DA CARTA SECRETA (surpresa)
    function initSecretLetter() {
        const targetDate = new Date('2026-07-19T00:00:00').getTime();
        const lockWrapper = document.getElementById('lock-wrapper');
        const timerLabel = document.getElementById('lock-timer-label');
        const timerDiv = document.getElementById('lock-timer');
        const letterCard = document.getElementById('secret-letter-card');

        if (!lockWrapper) return;

        let isUnlocked = false;

        function updateLockTimer() {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference <= 0) {
                // Destranca
                isUnlocked = true;
                timerLabel.style.display = 'none';
                timerDiv.style.display = 'none';
                lockWrapper.classList.add('unlocked');
                letterCard.classList.add('active');
                
                // Remove o cadeado após a abertura
                setTimeout(() => {
                    lockWrapper.style.display = 'none';
                }, 1500);
                
                return true;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            timerDiv.innerText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            return false;
        }

        // Tenta tremer o cadeado se ela clicar antes do tempo
        lockWrapper.addEventListener('click', () => {
            if (!isUnlocked) {
                lockWrapper.classList.add('shake');
                setTimeout(() => {
                    lockWrapper.classList.remove('shake');
                }, 500);
                alert("Ainda está trancado com amor... Aguarde até o dia 19/07!");
            } else {
                // Se já estiver destrancado e clicado, dispara confetes novamente
                triggerConfettiRain();
            }
        });

        const checkUnlocked = updateLockTimer();
        if (!checkUnlocked) {
            const interval = setInterval(() => {
                const finished = updateLockTimer();
                if (finished) {
                    clearInterval(interval);
                    triggerConfettiRain();
                }
            }, 1000);
        } else {
            // Se já iniciar destrancado
            triggerConfettiRain();
        }
    }

    // 11. BADGE DE PENDENTES (notificação visual)
    function checkPendingBadge() {
        const trigger = document.getElementById('admin-trigger');
        if (!trigger) return;

        function updateBadge() {
            getPendingTributes().then(pending => {
                // Remove badge anterior
                const oldBadge = trigger.querySelector('.admin-badge');
                if (oldBadge) oldBadge.remove();

                if (pending.length > 0) {
                    const badge = document.createElement('span');
                    badge.classList.add('admin-badge');
                    badge.textContent = pending.length;
                    trigger.appendChild(badge);
                    trigger.style.color = '#f2e2a2';
                    trigger.style.fontWeight = 'bold';
                } else {
                    trigger.style.color = '';
                    trigger.style.fontWeight = '';
                }
            });
        }

        updateBadge();
        // Verifica a cada 30 segundos
        setInterval(updateBadge, 30000);
    }

    // 12. PAINEL DO ADMINISTRADOR (OCULTO E CONTROLADO POR SENHA)
    function initAdminPanel() {
        const trigger = document.getElementById('admin-trigger');
        const panel = document.getElementById('admin-panel');
        const closeBtn = document.getElementById('admin-close-btn');
        
        if (!trigger || !panel) return;

        // 1 clique abre direto o painel
        trigger.addEventListener('click', () => {
            verifyAdminAccess();
        });

        const titleTrigger = document.querySelector('.hero-title');
        if (titleTrigger) {
            titleTrigger.addEventListener('click', () => {
                verifyAdminAccess();
            });
        }

        function verifyAdminAccess() {
            const pwd = prompt("Digite a senha de acesso administrativo:");
            if (pwd === ADMIN_PASSWORD) {
                panel.classList.add('active');
                renderAdminTributesList('pending');
            } else if (pwd !== null) {
                alert("Senha incorreta!");
            }
        }

        closeBtn.onclick = () => {
            panel.classList.remove('active');
        };

        // Exportação
        document.getElementById('btn-export-json').onclick = () => {
            exportTributesToJSON();
        };

        // Importação
        const importInput = document.getElementById('import-json-file');
        importInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                importTributesFromJSON(evt.target.result).then(res => {
                    if (res.success) {
                        alert(`Importado com sucesso! ${res.count} novas homenagens adicionadas.`);
                        initMural('all');
                        renderAdminTributesList('pending');
                    } else {
                        alert(`Erro ao importar arquivo: ${res.error}`);
                    }
                    importInput.value = '';
                });
            };
            reader.readAsText(file);
        };

        // Resetar Banco
        document.getElementById('btn-reset-db').onclick = () => {
            if (confirm("ATENÇÃO: Isso irá apagar TODAS as novas mensagens enviadas. Tem certeza?")) {
                resetDatabase().then(() => {
                    initMural('all');
                    renderAdminTributesList('pending');
                    checkPendingBadge();
                    alert("Banco de dados do mural resetado!");
                });
            }
        };

        // Abas de filtro do painel admin
        panel.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderAdminTributesList(btn.getAttribute('data-tab'));
            });
        });

        // Botão Aprovar Tudo
        const approveAllBtn = document.getElementById('btn-approve-all');
        if (approveAllBtn) {
            approveAllBtn.onclick = () => {
                getPendingTributes().then(pending => {
                    if (pending.length === 0) {
                        alert('Não há homenagens pendentes.');
                        return;
                    }
                    if (confirm(`Aprovar todas as ${pending.length} homenagens pendentes?`)) {
                        Promise.all(pending.map(t => approveTribute(t.id))).then(() => {
                            initMural('all');
                            renderAdminTributesList('pending');
                            checkPendingBadge();
                        });
                    }
                });
            };
        }

        // Renderiza a lista de mensagens com status filtrado
        function renderAdminTributesList(statusFilter = 'pending') {
            const listContainer = document.getElementById('admin-tributes-list');
            if (!listContainer) return;

            listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

            getAllTributes().then(allTributes => {
                const tributes = allTributes.filter(t => {
                    const s = t.status || 'approved';
                    return s === statusFilter;
                });

                listContainer.innerHTML = '';

                if (tributes.length === 0) {
                    const emptyMsg = statusFilter === 'pending'
                        ? '✅ Nenhuma homenagem pendente de aprovação!'
                        : statusFilter === 'approved'
                            ? 'Nenhuma homenagem aprovada ainda.'
                            : 'Nenhuma homenagem rejeitada.';
                    listContainer.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.9rem;">${emptyMsg}</div>`;
                    return;
                }

                tributes.forEach(t => {
                    const item = document.createElement('div');
                    item.classList.add('tribute-item-admin');
                    
                    const mediaTag = t.mediaType !== 'none' ? ` <span style="font-size:0.7rem;background:rgba(183,110,121,0.2);padding:2px 6px;border-radius:10px;">${t.mediaType.toUpperCase()}</span>` : '';
                    const msgPreview = t.message.length > 50 ? t.message.substring(0, 50) + '...' : t.message;

                    // Define botões de ação conforme o status atual
                    let actionButtons = '';
                    if (statusFilter === 'pending') {
                        actionButtons = `
                            <button class="approve-tribute-btn admin-action-btn" data-id="${t.id}" title="Aprovar" style="background:rgba(100,200,100,0.15);border-color:rgba(100,200,100,0.5);color:#6dc56d;">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="reject-tribute-btn admin-action-btn" data-id="${t.id}" title="Rejeitar" style="background:rgba(255,74,90,0.15);border-color:rgba(255,74,90,0.4);color:#ff4a5a;">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                    } else if (statusFilter === 'approved') {
                        actionButtons = `
                            <button class="reject-tribute-btn admin-action-btn" data-id="${t.id}" title="Revogar aprovação" style="background:rgba(255,74,90,0.15);border-color:rgba(255,74,90,0.4);color:#ff4a5a;">
                                <i class="fas fa-ban"></i>
                            </button>
                            <button class="delete-tribute-btn admin-action-btn" data-id="${t.id}" title="Excluir" style="background:rgba(80,80,80,0.2);border-color:rgba(150,150,150,0.3);color:#aaa;">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    } else {
                        actionButtons = `
                            <button class="approve-tribute-btn admin-action-btn" data-id="${t.id}" title="Aprovar" style="background:rgba(100,200,100,0.15);border-color:rgba(100,200,100,0.5);color:#6dc56d;">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="delete-tribute-btn admin-action-btn" data-id="${t.id}" title="Excluir" style="background:rgba(80,80,80,0.2);border-color:rgba(150,150,150,0.3);color:#aaa;">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    }

                    item.innerHTML = `
                        <div class="admin-tribute-info">
                            <h5>${escapeHTML(t.name)} ${mediaTag}</h5>
                            <p style="font-size:0.8rem;color:var(--text-muted);margin:3px 0;">${escapeHTML(msgPreview)}</p>
                            <span style="font-size:0.75rem;color:var(--gold-dark);">${t.date}</span>
                        </div>
                        <div class="admin-action-btns" style="display:flex;gap:6px;flex-shrink:0;">
                            ${actionButtons}
                        </div>
                    `;

                    // Aprovar
                    const approveBtn = item.querySelector('.approve-tribute-btn');
                    if (approveBtn) {
                        approveBtn.onclick = (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            approveTribute(id).then(() => {
                                initMural('all');
                                renderAdminTributesList(statusFilter);
                                checkPendingBadge();
                                showAdminToast('✅ Homenagem aprovada e publicada no mural!');
                            });
                        };
                    }

                    // Rejeitar
                    const rejectBtn = item.querySelector('.reject-tribute-btn');
                    if (rejectBtn) {
                        rejectBtn.onclick = (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            const label = statusFilter === 'approved' ? 'Deseja revogar a aprovação desta homenagem?' : `Rejeitar a homenagem de "${t.name}"?`;
                            if (confirm(label)) {
                                rejectTribute(id).then(() => {
                                    initMural('all');
                                    renderAdminTributesList(statusFilter);
                                    checkPendingBadge();
                                    showAdminToast('❌ Homenagem rejeitada.');
                                });
                            }
                        };
                    }

                    // Excluir
                    const deleteBtn = item.querySelector('.delete-tribute-btn');
                    if (deleteBtn) {
                        deleteBtn.onclick = (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            if (confirm(`Excluir permanentemente a homenagem de "${t.name}"?`)) {
                                deleteTribute(id).then(() => {
                                    initMural('all');
                                    renderAdminTributesList(statusFilter);
                                    checkPendingBadge();
                                    showAdminToast('🗑️ Homenagem excluída.');
                                });
                            }
                        };
                    }

                    listContainer.appendChild(item);
                });
            });
        }

        // Toast de feedback dentro do painel admin
        function showAdminToast(message) {
            const existing = panel.querySelector('.admin-toast');
            if (existing) existing.remove();
            
            const toast = document.createElement('div');
            toast.classList.add('admin-toast');
            toast.textContent = message;
            panel.appendChild(toast);
            
            setTimeout(() => toast.remove(), 3000);
        }
    }
});
