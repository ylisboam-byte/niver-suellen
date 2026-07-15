/**
 * database.js
 * Gerenciamento local das homenagens e fotos para o aniversário de Suellen.
 * Utiliza o LocalStorage com suporte a importação/exportação JSON para o administrador.
 */

// Chave para armazenamento no LocalStorage
const STORAGE_KEY = 'suellen_tributes_db';

// Homenagens iniciais pré-carregadas (iniciando o mural limpo)
const INITIAL_TRIBUTES = [];

// Carregar as homenagens
function getTributes() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        // Se não houver dados, inicializa com os dados pré-carregados
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRIBUTES));
        return INITIAL_TRIBUTES;
    }
    try {
        const parsed = JSON.parse(data);
        // Remove dados de teste antigos contendo IDs de sementes ou a relação 'amor'
        const hasTestData = parsed.some(t => (t.id && t.id.startsWith('seed-')) || t.relation === 'amor');
        if (hasTestData) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            return [];
        }
        return parsed;
    } catch (e) {
        console.error('Erro ao ler LocalStorage, reiniciando dados...', e);
        return INITIAL_TRIBUTES;
    }
}

// Salvar a lista completa de homenagens
function saveTributes(tributes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tributes));
}

// Adicionar uma nova homenagem
function addTribute(name, relation, message, photoBase64) {
    const tributes = getTributes();
    const newTribute = {
        id: 'tribute-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: name,
        relation: relation,
        message: message,
        date: new Date().toLocaleDateString('pt-BR'),
        photo: photoBase64 || ''
    };
    
    tributes.unshift(newTribute); // Adiciona no início para aparecer primeiro
    saveTributes(tributes);
    return newTribute;
}

// Remover uma homenagem (Admin)
function deleteTribute(id) {
    let tributes = getTributes();
    tributes = tributes.filter(t => t.id !== id);
    saveTributes(tributes);
}

// Exportar homenagens para JSON
function exportTributesToJSON() {
    const tributes = getTributes();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tributes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `homenagens_suellen_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Importar e mesclar homenagens de um JSON
function importTributesFromJSON(jsonString) {
    try {
        const importedData = JSON.parse(jsonString);
        if (!Array.isArray(importedData)) {
            throw new Error('O formato do arquivo é inválido. Espera-se uma lista.');
        }
        
        const currentTributes = getTributes();
        const currentIds = new Set(currentTributes.map(t => t.id));
        
        let addedCount = 0;
        importedData.forEach(item => {
            // Verifica se o item é válido e se já não existe
            if (item.id && item.name && item.message && !currentIds.has(item.id)) {
                currentTributes.push(item);
                addedCount++;
            }
        });
        
        if (addedCount > 0) {
            // Ordenar por ID ou data se necessário, ou apenas salvar
            saveTributes(currentTributes);
        }
        return { success: true, count: addedCount };
    } catch (e) {
        console.error('Erro na importação de JSON:', e);
        return { success: false, error: e.message };
    }
}
