/**
 * database.js
 * Gerenciamento das homenagens usando IndexedDB (para suportar arquivos grandes como áudio e vídeo).
 * Permite armazenamento local seguro em formato Blob e conversão automática para Base64 na importação/exportação.
 */

const DB_NAME = 'suellen_tributes_db';
const DB_VERSION = 1;
const STORE_NAME = 'tributes';

// Abre a conexão com o banco de dados IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// Carrega todas as homenagens ordenadas por data decrescente
function getTributes() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const list = request.result || [];
                // Ordena decrescente pelo timestamp contido no ID (tribute-timestamp-random)
                list.sort((a, b) => {
                    const timeA = a.id.startsWith('tribute-') ? parseInt(a.id.split('-')[1]) : 0;
                    const timeB = b.id.startsWith('tribute-') ? parseInt(b.id.split('-')[1]) : 0;
                    return timeB - timeA;
                });
                resolve(list);
            };
            
            request.onerror = () => reject(request.error);
        });
    });
}

// Adiciona uma nova homenagem (Blob de mídia e mediaType: 'image', 'audio', 'video', 'none')
function addTribute(name, relation, message, mediaBlob, mediaType) {
    const newTribute = {
        id: 'tribute-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: name,
        relation: relation,
        message: message,
        date: new Date().toLocaleDateString('pt-BR'),
        media: mediaBlob || null,      // Arquivo Blob real
        mediaType: mediaType || 'none' // 'image', 'audio', 'video', 'none'
    };

    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(newTribute);
            
            request.onsuccess = () => resolve(newTribute);
            request.onerror = () => reject(request.error);
        });
    });
}

// Remove uma homenagem
function deleteTribute(id) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

// Reseta o banco de dados (limpa todas as tabelas)
function resetDatabase() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

// Auxiliares de conversão assíncrona para Importação/Exportação

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(base64Data) {
    if (!base64Data) return null;
    try {
        const parts = base64Data.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
        console.error('Falha ao decodificar Base64 para Blob:', e);
        return null;
    }
}

// Exporta homenagens convertendo os Blobs para string Base64 em lote
function exportTributesToJSON() {
    getTributes().then(async (tributes) => {
        const exportData = [];
        for (const t of tributes) {
            let mediaBase64 = '';
            if (t.media instanceof Blob) {
                mediaBase64 = await blobToBase64(t.media);
            }
            exportData.push({
                id: t.id,
                name: t.name,
                relation: t.relation,
                message: t.message,
                date: t.date,
                mediaBase64: mediaBase64,
                mediaType: t.mediaType
            });
        }
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `homenagens_suellen_db_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
}

// Importa e mescla JSON convertendo Base64 de volta para arquivos Blob locais no IndexedDB
function importTributesFromJSON(jsonString) {
    return new Promise(async (resolve) => {
        try {
            const importedData = JSON.parse(jsonString);
            if (!Array.isArray(importedData)) {
                throw new Error('O formato do arquivo é inválido. Espera-se uma lista.');
            }
            
            const db = await openDB();
            let addedCount = 0;
            
            for (const item of importedData) {
                if (item.id && item.name && item.message) {
                    const exists = await checkIfExists(db, item.id);
                    if (!exists) {
                        let mediaBlob = null;
                        if (item.mediaBase64) {
                            mediaBlob = base64ToBlob(item.mediaBase64);
                        }
                        
                        const newTribute = {
                            id: item.id,
                            name: item.name,
                            relation: item.relation,
                            message: item.message,
                            date: item.date,
                            media: mediaBlob,
                            mediaType: item.mediaType || 'none'
                        };
                        
                        await insertTributeDirectly(db, newTribute);
                        addedCount++;
                    }
                }
            }
            resolve({ success: true, count: addedCount });
        } catch (e) {
            console.error('Erro na importação do JSON:', e);
            resolve({ success: false, error: e.message });
        }
    });
}

function checkIfExists(db, id) {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => resolve(false);
    });
}

function insertTributeDirectly(db, tribute) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(tribute);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
