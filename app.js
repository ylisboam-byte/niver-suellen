/**
 * app.js
 * Lógica principal do Mural de Homenagens da Suellen
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

    // 1. INICIALIZAR ELEMENTOS E COMPONENTES
    initHeartsBackground();
    initHeroSlider(SUELLEN_IMAGES);
    initCountdown();
    initAudioPlayer();
    initQRcode();
    initMural('all');
    initAdminPanel();

    // 2. SISTEMA DE PARTÍCULAS (CORAÇÕES FLUTUANTES)
    function initHeartsBackground() {
        const container = document.getElementById('hearts-container');
        if (!container) return;

        const icons = ['❤️', '💖', '✨', '🌸', '💕'];
        
        function createHeart() {
            const heart = document.createElement('div');
            heart.classList.add('heart-particle');
            
            // Randomiza caractere, posição, tamanho e velocidade
            heart.innerText = icons[Math.floor(Math.random() * icons.length)];
            heart.style.left = Math.random() * 100 + 'vw';
            
            const size = Math.random() * 1.5 + 0.8;
            heart.style.fontSize = size + 'rem';
            
            const duration = Math.random() * 6 + 7; // 7s a 13s
            heart.style.animationDuration = duration + 's';
            
            // Suave desfoque para efeito de profundidade
            if (size < 1.2) {
                heart.style.filter = 'blur(1px)';
                heart.style.opacity = '0.4';
            } else {
                heart.style.opacity = '0.7';
            }

            container.appendChild(heart);

            // Remove após a conclusão da animação
            setTimeout(() => {
                heart.remove();
            }, duration * 1000);
        }

        // Cria partículas a cada 800ms
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
            
            // Usa aspas duplas e codifica os espaços do nome do arquivo
            const encodedSrc = imgSrc.replace(/ /g, '%20');
            slide.style.backgroundImage = `url("${encodedSrc}")`;
            slider.appendChild(slide);
        });

        // Loop de transição
        let currentSlide = 0;
        const slides = slider.querySelectorAll('.slide');
        
        if (slides.length > 0) {
            setInterval(() => {
                slides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add('active');
            }, 5000); // 5 segundos por foto
        }
    }

    // 4. CRONÔMETRO REGRESSIVO (19/07/2026)
    function initCountdown() {
        const targetDate = new Date('2026-07-19T00:00:00').getTime();

        function updateTimer() {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference <= 0) {
                // Caso seja dia do aniversário ou já tenha passado
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

        // Atualiza a cada segundo
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

        // Tentar tocar no primeiro clique na página (restrição de navegador)
        const playOnFirstInteraction = () => {
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
            e.stopPropagation(); // impede acionamento de eventos na página
            if (audio.paused) {
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

    // 6. RENDERIZAÇÃO E FILTRAGEM DO MURAL
    function initMural(filter = 'all') {
        const grid = document.getElementById('mural-grid');
        const galleryGrid = document.getElementById('gallery-grid');
        if (!grid) return;

        // Carrega homenagens da base local
        const tributes = getTributes();
        grid.innerHTML = '';

        // Filtra homenagens
        const filteredTributes = filter === 'all' 
            ? tributes 
            : tributes.filter(t => t.relation === filter);

        if (filteredTributes.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="far fa-envelope-open" style="font-size: 3rem; margin-bottom: 15px; color: var(--rose-gold-light);"></i>
                    <p>Nenhuma homenagem encontrada nesta categoria ainda. Seja o primeiro a enviar!</p>
                </div>
            `;
        } else {
            filteredTributes.forEach(tribute => {
                const card = document.createElement('div');
                card.classList.add('tribute-card');
                card.setAttribute('data-id', tribute.id);
                card.addEventListener('click', () => openTributeModal(tribute));

                let photoHtml = '';
                // Se for imagem local pré-semeada ou imagem em base64
                if (tribute.photo) {
                    const src = tribute.photo.startsWith('data:') 
                        ? tribute.photo 
                        : tribute.photo.replace(/ /g, '%20');
                    photoHtml = `<img class="tribute-card-photo" src="${src}" alt="Foto de ${tribute.name}">`;
                }

                const relationText = tribute.relation === 'familia' ? 'Família' : tribute.relation === 'amigo' ? 'Amigo(a)' : 'Convidado';
                const relationClass = `relation-${tribute.relation}`;

                card.innerHTML = `
                    ${photoHtml}
                    <div class="tribute-header">
                        <span class="tribute-sender">${escapeHTML(tribute.name)}</span>
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

        // Renderiza também a Galeria Oficial de Momentos
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
            
            // Coleta fotos das homenagens que foram enviadas + fotos locais
            const galleryPhotos = [];
            
            // Adiciona imagens padrões da Suellen
            SUELLEN_IMAGES.forEach((img, idx) => {
                galleryPhotos.push({
                    src: img,
                    caption: `Momento Especial ${idx + 1}`
                });
            });

            // Adiciona fotos enviadas por convidados que tenham fotos
            tributes.forEach(t => {
                if (t.photo && !SUELLEN_IMAGES.includes(t.photo)) {
                    galleryPhotos.push({
                        src: t.photo,
                        caption: `Enviada por ${t.name}`
                    });
                }
            });

            galleryPhotos.forEach(photo => {
                const item = document.createElement('div');
                item.classList.add('gallery-item');
                
                const src = photo.src.startsWith('data:') ? photo.src : photo.src.replace(/ /g, '%20');
                
                item.innerHTML = `
                    <img src="${src}" alt="${photo.caption}">
                    <div class="gallery-overlay">
                        <div class="gallery-caption">${photo.caption}</div>
                    </div>
                `;
                
                // Abre modal de visualização da foto se clicado
                item.addEventListener('click', () => {
                    openPhotoModal(src, photo.caption);
                });

                galleryGrid.appendChild(item);
            });
        }

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

    // 7. MODAIS (LEITURA DE CARTA E VISUALIZADOR DE FOTO)
    const modal = document.getElementById('tribute-modal');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');

    function openTributeModal(tribute) {
        if (!modal) return;
        
        document.getElementById('modal-sender').innerText = tribute.name;
        document.getElementById('modal-date').innerText = tribute.date;
        document.getElementById('modal-message').innerText = tribute.message;
        
        const modalPhoto = document.getElementById('modal-photo');
        if (tribute.photo) {
            const src = tribute.photo.startsWith('data:') ? tribute.photo : tribute.photo.replace(/ /g, '%20');
            modalPhoto.src = src;
            modalPhoto.style.display = 'block';
        } else {
            modalPhoto.style.display = 'none';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // impede scroll de fundo
    }

    function openPhotoModal(imgSrc, caption) {
        if (!modal) return;
        
        document.getElementById('modal-sender').innerText = caption;
        document.getElementById('modal-date').innerText = '';
        document.getElementById('modal-message').innerText = '';
        
        const modalPhoto = document.getElementById('modal-photo');
        modalPhoto.src = imgSrc;
        modalPhoto.style.display = 'block';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    // 8. GERADOR AUTOMÁTICO DE QR CODE (CTA)
    function initQRcode() {
        const qrImg = document.getElementById('qr-code-img');
        if (!qrImg) return;

        // Constrói o link para form.html baseado na URL atual
        const currentUrl = window.location.href;
        let formUrl = '';
        
        if (currentUrl.endsWith('index.html')) {
            formUrl = currentUrl.replace('index.html', 'form.html');
        } else if (currentUrl.endsWith('/')) {
            formUrl = currentUrl + 'form.html';
        } else {
            // Caso seja aberto diretamente como arquivo ou pasta
            const lastSlash = currentUrl.lastIndexOf('/');
            formUrl = currentUrl.substring(0, lastSlash + 1) + 'form.html';
        }

        // Usa API pública gratuita do qrserver para criar o QR Code
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(formUrl)}`;
    }

    // 9. PAINEL DO ADMINISTRADOR (OCULTO E CONTROLADO POR SENHA)
    function initAdminPanel() {
        const trigger = document.getElementById('admin-trigger');
        const panel = document.getElementById('admin-panel');
        const closeBtn = document.getElementById('admin-close-btn');
        
        if (!trigger || !panel) return;

        // Desbloquear painel por cliques múltiplos no trigger oculto "."
        let clickCount = 0;
        trigger.addEventListener('click', () => {
            clickCount++;
            if (clickCount >= 5) {
                clickCount = 0;
                verifyAdminAccess();
            }
        });

        // Alternativa: Permitir acesso se Yago clicar 5 vezes no título "Suellen Lisboa" do banner
        const titleTrigger = document.querySelector('.hero-title');
        if (titleTrigger) {
            let titleClicks = 0;
            titleTrigger.addEventListener('click', () => {
                titleClicks++;
                if (titleClicks >= 5) {
                    titleClicks = 0;
                    verifyAdminAccess();
                }
            });
        }

        function verifyAdminAccess() {
            const pwd = prompt("Digite a senha de acesso administrativo:");
            if (pwd === ADMIN_PASSWORD) {
                panel.classList.add('active');
                renderAdminTributesList();
            } else if (pwd !== null) {
                alert("Senha incorreta!");
            }
        }

        closeBtn.onclick = () => {
            panel.classList.remove('active');
        };

        // Ações de exportação
        document.getElementById('btn-export-json').onclick = () => {
            exportTributesToJSON();
        };

        // Ações de importação
        const importInput = document.getElementById('import-json-file');
        importInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const res = importTributesFromJSON(evt.target.result);
                if (res.success) {
                    alert(`Importado com sucesso! ${res.count} novas homenagens adicionadas.`);
                    initMural('all');
                    renderAdminTributesList();
                } else {
                    alert(`Erro ao importar arquivo: ${res.error}`);
                }
                importInput.value = ''; // limpa o input
            };
            reader.readAsText(file);
        };

        // Ações de reset do banco
        document.getElementById('btn-reset-db').onclick = () => {
            if (confirm("ATENÇÃO: Isso irá apagar TODAS as novas mensagens enviadas e restaurar o mural para as mensagens originais de exemplo. Tem certeza?")) {
                localStorage.removeItem(STORAGE_KEY);
                initMural('all');
                renderAdminTributesList();
                alert("Banco de dados resetado com sucesso!");
            }
        };

        // Renderiza a lista de mensagens para remoção rápida
        function renderAdminTributesList() {
            const listContainer = document.getElementById('admin-tributes-list');
            if (!listContainer) return;

            const tributes = getTributes();
            listContainer.innerHTML = '';

            tributes.forEach(t => {
                const item = document.createElement('div');
                item.classList.add('tribute-item-admin');
                
                item.innerHTML = `
                    <div class="admin-tribute-info">
                        <h5>${escapeHTML(t.name)}</h5>
                        <p>${escapeHTML(t.message.substring(0, 40))}...</p>
                    </div>
                    <button class="delete-tribute-btn" data-id="${t.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                `;

                // Configura o botão de exclusão
                item.querySelector('.delete-tribute-btn').onclick = (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm(`Deseja mesmo excluir a homenagem de "${t.name}"?`)) {
                        deleteTribute(id);
                        initMural('all');
                        renderAdminTributesList();
                    }
                };

                listContainer.appendChild(item);
            });
        }
    }
});
