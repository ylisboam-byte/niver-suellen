/**
 * database.js
 * Gerenciamento das homenagens usando IndexedDB (para suportar arquivos grandes como áudio e vídeo).
 * Permite armazenamento local seguro em formato Blob e conversão automática para Base64 na importação/exportação.
 * 
 * v2.1 - Adicionado campo `status` ('pending' | 'approved') para moderação de conteúdo.
 */

const DB_NAME = 'suellen_tributes_db';
const DB_VERSION = 2; // Versão incrementada para forçar migração com o novo campo `status`
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
            // Migração: garante que registros antigos sem `status` recebam 'approved'
            // (upgrade é só estrutural; a migração de dados é feita após abertura)
        };
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            // Migração de dados: adiciona `status: 'approved'` para registros antigos
            migrateOldRecords(db).then(() => resolve(db));
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

// Migra registros antigos que não possuem o campo `status`
function migrateOldRecords(db) {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const records = request.result || [];
            let updated = 0;
            records.forEach(record => {
                if (!record.status) {
                    record.status = 'approved'; // Homenagens antigas já aprovadas automaticamente
                    store.put(record);
                    updated++;
                }
            });
            transaction.oncomplete = () => resolve(updated);
            transaction.onerror = () => resolve(0);
        };
        request.onerror = () => resolve(0);
    });
}

// Carrega TODAS as homenagens (sem filtro de status) — para uso administrativo
function getAllTributes() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const list = request.result || [];
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

// Carrega apenas homenagens APROVADAS — para exibição no mural público
function getTributes() {
    return getAllTributes().then(list => {
        return list.filter(t => t.status === 'approved');
    });
}

// Carrega apenas homenagens PENDENTES — para o painel admin
function getPendingTributes() {
    return getAllTributes().then(list => {
        return list.filter(t => t.status === 'pending');
    });
}

// Adiciona uma nova homenagem com status 'pending' (aguardando aprovação)
function addTribute(name, relation, message, mediaBlob, mediaType) {
    const newTribute = {
        id: 'tribute-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: name,
        relation: relation,
        message: message,
        date: new Date().toLocaleDateString('pt-BR'),
        media: mediaBlob || null,      // Arquivo Blob real
        mediaType: mediaType || 'none', // 'image', 'audio', 'video', 'none'
        status: 'pending'              // Aguardando aprovação do administrador
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

// Aprova uma homenagem (muda status para 'approved')
function approveTribute(id) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getReq = store.get(id);
            
            getReq.onsuccess = () => {
                const tribute = getReq.result;
                if (tribute) {
                    tribute.status = 'approved';
                    const putReq = store.put(tribute);
                    putReq.onsuccess = () => resolve(tribute);
                    putReq.onerror = () => reject(putReq.error);
                } else {
                    reject(new Error('Homenagem não encontrada'));
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    });
}

// Rejeita uma homenagem (muda status para 'rejected')
function rejectTribute(id) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getReq = store.get(id);
            
            getReq.onsuccess = () => {
                const tribute = getReq.result;
                if (tribute) {
                    tribute.status = 'rejected';
                    const putReq = store.put(tribute);
                    putReq.onsuccess = () => resolve(tribute);
                    putReq.onerror = () => reject(putReq.error);
                } else {
                    reject(new Error('Homenagem não encontrada'));
                }
            };
            getReq.onerror = () => reject(getReq.error);
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
    getAllTributes().then(async (tributes) => {
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
                mediaType: t.mediaType,
                status: t.status || 'approved'
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
                            mediaType: item.mediaType || 'none',
                            status: item.status || 'approved' // Mantém status ao importar
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
