/**
 * Grist Code Editor Pro Widget
 * Copyright 2026 Said Hamadou (isaytoo)
 * Licensed under the Apache License, Version 2.0
 * https://github.com/isaytoo/grist-code-editor-pro-widget
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================

let editorJS = null;
let editorHTML = null;
let editorCSS = null;
let editorPython = null;
let currentTab = 'js';
let columns = [];
let records = [];
let tableName = '';
let isInstalled = false;

// =============================================================================
// GRIST API DEFINITIONS (for autocomplete)
// =============================================================================

// =============================================================================
// PYTHON GRIST FORMULAS (for autocomplete)
// =============================================================================

const pythonGristFormulas = [
  { name: '$Column', desc: 'Référence une colonne', snippet: '$ColumnName' },
  { name: 'lookupOne', desc: 'Recherche un enregistrement', snippet: 'Table.lookupOne(Column=$Value)' },
  { name: 'lookupRecords', desc: 'Recherche plusieurs enregistrements', snippet: 'Table.lookupRecords(Column=$Value)' },
  { name: 'Table.all', desc: 'Tous les enregistrements', snippet: 'Table.all' },
  { name: 'sum()', desc: 'Somme de valeurs', snippet: 'sum(Table.lookupRecords(Condition).Column)' },
  { name: 'len()', desc: 'Nombre d\'éléments', snippet: 'len(Table.lookupRecords(Condition))' },
  { name: 'max()', desc: 'Valeur maximum', snippet: 'max(Table.all.Column)' },
  { name: 'min()', desc: 'Valeur minimum', snippet: 'min(Table.all.Column)' },
  { name: 'NOW()', desc: 'Date et heure actuelles', snippet: 'NOW()' },
  { name: 'TODAY()', desc: 'Date du jour', snippet: 'TODAY()' },
  { name: 'DATEADD', desc: 'Ajouter à une date', snippet: 'DATEADD($Date, days=7)' },
  { name: 'DATEDIF', desc: 'Différence entre dates', snippet: 'DATEDIF($DateDebut, $DateFin, "D")' },
  { name: 'strftime', desc: 'Formater une date', snippet: '$Date.strftime("%d/%m/%Y")' },
  { name: 'user.Email', desc: 'Email utilisateur (trigger)', snippet: 'user.Email' },
  { name: 'user.Name', desc: 'Nom utilisateur (trigger)', snippet: 'user.Name' },
  { name: 'rec.id', desc: 'ID enregistrement courant', snippet: 'rec.id' },
  { name: 'if else', desc: 'Condition', snippet: '"Oui" if $Condition else "Non"' },
  { name: 'CONTAINS', desc: 'Contient (texte)', snippet: 'CONTAINS($Text, "recherche")' },
  { name: 'UPPER/LOWER', desc: 'Majuscules/Minuscules', snippet: '$Text.upper()' },
  { name: 'CONCATENATE', desc: 'Concaténer', snippet: '$Col1 + " " + $Col2' },
];

const gristApiDefinitions = [
  { name: 'grist.ready', desc: 'Initialise le widget', snippet: "grist.ready({ requiredAccess: 'full' });" },
  { name: 'grist.onRecord', desc: 'Écoute l\'enregistrement sélectionné', snippet: "grist.onRecord(function(record) {\n  console.log('Record:', record);\n});" },
  { name: 'grist.onRecords', desc: 'Écoute tous les enregistrements', snippet: "grist.onRecords(function(records) {\n  console.log('Records:', records);\n});" },
  { name: 'grist.onOptions', desc: 'Écoute les options du widget', snippet: "grist.onOptions(function(options) {\n  console.log('Options:', options);\n});" },
  { name: 'grist.setOption', desc: 'Définit une option', snippet: "grist.setOption('key', 'value');" },
  { name: 'grist.setOptions', desc: 'Définit plusieurs options', snippet: "grist.setOptions({ key1: 'value1', key2: 'value2' });" },
  { name: 'grist.getOption', desc: 'Récupère une option', snippet: "var value = await grist.getOption('key');" },
  { name: 'grist.getTable', desc: 'Récupère l\'ID de la table', snippet: "var tableId = await grist.getTable();" },
  { name: 'grist.getAccessToken', desc: 'Récupère le token d\'accès', snippet: "var token = await grist.getAccessToken();" },
  { name: 'grist.docApi.fetchTable', desc: 'Récupère une table complète', snippet: "var data = await grist.docApi.fetchTable('TableName');" },
  { name: 'grist.docApi.applyUserActions', desc: 'Applique des actions', snippet: "await grist.docApi.applyUserActions([\n  ['AddRecord', 'TableName', null, { Column: 'value' }]\n]);" },
  { name: 'grist.selectedTable.create', desc: 'Crée un enregistrement', snippet: "await grist.selectedTable.create({ fields: { Column: 'value' } });" },
  { name: 'grist.selectedTable.update', desc: 'Met à jour un enregistrement', snippet: "await grist.selectedTable.update({ id: recordId, fields: { Column: 'newValue' } });" },
  { name: 'grist.selectedTable.destroy', desc: 'Supprime un enregistrement', snippet: "await grist.selectedTable.destroy(recordId);" },
  { name: 'grist.setCursorPos', desc: 'Définit la position du curseur', snippet: "grist.setCursorPos({ rowId: recordId });" },
];

// =============================================================================
// SNIPPETS
// =============================================================================

const snippets = [
  {
    title: 'Widget de base',
    desc: 'Structure minimale',
    js: `// Widget de base
grist.ready({ requiredAccess: 'read table' });

grist.onRecord(function(record) {
  if (!record) return;
  document.getElementById('content').innerHTML = '<pre>' + JSON.stringify(record, null, 2) + '</pre>';
});`,
    html: `<div id="content">Sélectionnez un enregistrement...</div>`,
    css: `#content { padding: 20px; font-family: sans-serif; }`
  },
  {
    title: 'Liste d\'enregistrements',
    desc: 'Affiche tous les enregistrements',
    js: `// Liste d'enregistrements
grist.ready({ requiredAccess: 'read table' });

grist.onRecords(function(records) {
  var html = '<ul>';
  records.forEach(function(r) {
    html += '<li>' + JSON.stringify(r) + '</li>';
  });
  html += '</ul>';
  document.getElementById('list').innerHTML = html;
});`,
    html: `<div id="list">Chargement...</div>`,
    css: `#list { padding: 10px; } #list li { margin: 5px 0; padding: 8px; background: #f5f5f5; border-radius: 4px; }`
  },
  {
    title: 'Formulaire d\'édition',
    desc: 'Édite l\'enregistrement sélectionné',
    js: `// Formulaire d'édition
grist.ready({ requiredAccess: 'full' });

var currentRecord = null;

grist.onRecord(function(record) {
  currentRecord = record;
  if (!record) return;
  // Remplir le formulaire avec les données
  document.getElementById('field1').value = record.Column1 || '';
});

async function saveRecord() {
  if (!currentRecord) return;
  var newValue = document.getElementById('field1').value;
  await grist.selectedTable.update({
    id: currentRecord.id,
    fields: { Column1: newValue }
  });
  alert('Enregistré !');
}`,
    html: `<div class="form">
  <label>Champ 1:</label>
  <input type="text" id="field1" />
  <button onclick="saveRecord()">Enregistrer</button>
</div>`,
    css: `.form { padding: 20px; } .form label { display: block; margin-bottom: 5px; } .form input { width: 100%; padding: 8px; margin-bottom: 10px; } .form button { padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; }`
  },
  {
    title: 'Graphique simple',
    desc: 'Affiche un graphique avec Chart.js',
    js: `// Graphique simple avec Chart.js
grist.ready({ requiredAccess: 'read table' });

var chart = null;

grist.onRecords(function(records) {
  var labels = records.map(function(r) { return r.Label || r.id; });
  var values = records.map(function(r) { return r.Value || 0; });
  
  var ctx = document.getElementById('chart').getContext('2d');
  
  if (chart) chart.destroy();
  
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Valeurs',
        data: values,
        backgroundColor: '#4CAF50'
      }]
    }
  });
});`,
    html: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<canvas id="chart"></canvas>`,
    css: `canvas { max-width: 100%; max-height: 400px; }`
  },
  {
    title: 'Créer un enregistrement',
    desc: 'Ajoute un nouvel enregistrement',
    js: `// Créer un enregistrement
grist.ready({ requiredAccess: 'full' });

async function createRecord() {
  var value = document.getElementById('newValue').value;
  if (!value) return alert('Entrez une valeur');
  
  await grist.selectedTable.create({
    fields: { Column1: value }
  });
  
  document.getElementById('newValue').value = '';
  alert('Enregistrement créé !');
}`,
    html: `<div class="form">
  <input type="text" id="newValue" placeholder="Nouvelle valeur" />
  <button onclick="createRecord()">Créer</button>
</div>`,
    css: `.form { padding: 20px; display: flex; gap: 10px; } .form input { flex: 1; padding: 10px; } .form button { padding: 10px 20px; background: #2196F3; color: white; border: none; cursor: pointer; }`
  }
];

// =============================================================================
// TEMPLATES
// =============================================================================

const templates = [
  {
    icon: '📋',
    title: 'Widget vide',
    js: `// Widget vide - Commencez ici !
grist.ready({ requiredAccess: 'read table' });

grist.onRecord(function(record) {
  console.log('Record sélectionné:', record);
});`,
    html: `<!DOCTYPE html>
<html>
<head>
  <style id="custom-css"></style>
</head>
<body>
  <div id="app">
    <h1>Mon Widget</h1>
    <p>Commencez à coder !</p>
  </div>
</body>
</html>`,
    css: `body { font-family: sans-serif; padding: 20px; margin: 0; }
h1 { color: #333; }
#app { max-width: 800px; margin: 0 auto; }`
  },
  {
    icon: '📊',
    title: 'Dashboard KPI',
    js: `// Dashboard KPI
grist.ready({ requiredAccess: 'read table' });

grist.onRecords(function(records) {
  var total = records.length;
  var sum = records.reduce(function(acc, r) { return acc + (r.Value || 0); }, 0);
  var avg = total > 0 ? (sum / total).toFixed(2) : 0;
  
  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-sum').textContent = sum;
  document.getElementById('kpi-avg').textContent = avg;
});`,
    html: `<!DOCTYPE html>
<html>
<head>
  <style id="custom-css"></style>
</head>
<body>
  <div class="dashboard">
    <div class="kpi-card">
      <div class="kpi-value" id="kpi-total">0</div>
      <div class="kpi-label">Total</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" id="kpi-sum">0</div>
      <div class="kpi-label">Somme</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" id="kpi-avg">0</div>
      <div class="kpi-label">Moyenne</div>
    </div>
  </div>
</body>
</html>`,
    css: `.dashboard { display: flex; gap: 20px; padding: 20px; flex-wrap: wrap; }
.kpi-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; min-width: 150px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.kpi-value { font-size: 36px; font-weight: bold; }
.kpi-label { font-size: 14px; opacity: 0.9; margin-top: 8px; }`
  },
  {
    icon: '📝',
    title: 'Liste stylisée',
    js: `// Liste stylisée
grist.ready({ requiredAccess: 'read table' });

grist.onRecords(function(records) {
  var html = '';
  records.forEach(function(r, i) {
    html += '<div class="list-item">';
    html += '<span class="item-number">' + (i + 1) + '</span>';
    html += '<span class="item-title">' + (r.Title || r.Name || 'Item ' + r.id) + '</span>';
    html += '</div>';
  });
  document.getElementById('list').innerHTML = html || '<p class="empty">Aucun enregistrement</p>';
});`,
    html: `<!DOCTYPE html>
<html>
<head>
  <style id="custom-css"></style>
</head>
<body>
  <div class="container">
    <h2>📋 Liste</h2>
    <div id="list"></div>
  </div>
</body>
</html>`,
    css: `body { font-family: sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
.container { max-width: 600px; margin: 0 auto; }
h2 { color: #333; }
.list-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; margin-bottom: 8px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.item-number { width: 30px; height: 30px; background: #4CAF50; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
.item-title { font-size: 15px; color: #333; }
.empty { color: #999; text-align: center; padding: 40px; }`
  }
];

// =============================================================================
// DEFAULT CODE
// =============================================================================

const defaultJS = `// Grist Code Editor Pro
// Commencez à coder votre widget personnalisé !

grist.ready({ requiredAccess: 'read table' });

// Écoute l'enregistrement sélectionné
grist.onRecord(function(record) {
  if (!record) {
    document.getElementById('content').innerHTML = '<p class="placeholder">Sélectionnez un enregistrement...</p>';
    return;
  }
  
  // Affiche les données
  var html = '<div class="record-card">';
  html += '<h2>Enregistrement #' + record.id + '</h2>';
  html += '<pre>' + JSON.stringify(record, null, 2) + '</pre>';
  html += '</div>';
  
  document.getElementById('content').innerHTML = html;
});

console.log('Widget initialisé !');
`;

const defaultHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style id="custom-css"></style>
</head>
<body>
  <div id="app">
    <header>
      <h1>🚀 Mon Widget</h1>
    </header>
    <main id="content">
      <p class="placeholder">Sélectionnez un enregistrement...</p>
    </main>
  </div>
</body>
</html>`;

const defaultPython = `# Formules Python pour Grist
# Ce code est destiné à être copié dans les colonnes de formules Grist
# Il ne s'exécute PAS dans ce widget, mais dans Grist directement

# ============================================
# EXEMPLES DE FORMULES GRIST
# ============================================

# Formule simple - référencer une autre colonne
$Nom + " " + $Prenom

# Calcul conditionnel
"Urgent" if $Priorite == "haute" else "Normal"

# Somme avec condition (SUMIF)
sum(Table.lookupRecords(Statut="Actif").Montant)

# Recherche (VLOOKUP)
Clients.lookupOne(Email=$Email).Nom

# Date du jour
NOW()

# Formatage de date
$Date.strftime("%d/%m/%Y") if $Date else ""

# Liste de valeurs uniques
list(set(Table.all.Categorie))

# Comptage
len(Table.lookupRecords(Statut="Terminé"))

# Moyenne
sum(Table.all.Score) / len(Table.all) if len(Table.all) > 0 else 0

# Trigger formula (user info)
user.Email  # Nécessite recalcWhen=2

# Accès à l'enregistrement courant
rec.id  # ID de l'enregistrement
`;

const defaultCSS = `/* Styles de votre widget */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  padding: 20px;
}

#app {
  max-width: 800px;
  margin: 0 auto;
}

header {
  margin-bottom: 20px;
}

header h1 {
  font-size: 24px;
  color: #0f172a;
}

.placeholder {
  color: #94a3b8;
  text-align: center;
  padding: 40px;
}

.record-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.record-card h2 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #334155;
}

.record-card pre {
  background: #f1f5f9;
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
  overflow-x: auto;
}
`;

// =============================================================================
// INITIALIZATION
// =============================================================================

require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

require(['vs/editor/editor.main'], function() {
  // Register Python Grist completions
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: function(model, position) {
      var word = model.getWordUntilPosition(position);
      var range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      
      var suggestions = pythonGristFormulas.map(function(api) {
        return {
          label: api.name,
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: api.desc,
          insertText: api.snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range
        };
      });
      
      return { suggestions: suggestions };
    }
  });

  // Register Grist API completions
  monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: function(model, position) {
      var word = model.getWordUntilPosition(position);
      var range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      
      var suggestions = gristApiDefinitions.map(function(api) {
        return {
          label: api.name,
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: api.desc,
          insertText: api.snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range
        };
      });
      
      return { suggestions: suggestions };
    }
  });

  // Create JS Editor
  editorJS = monaco.editor.create(document.getElementById('editor-js'), {
    value: defaultJS,
    language: 'javascript',
    theme: 'vs-dark',
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2
  });

  // Create HTML Editor
  editorHTML = monaco.editor.create(document.getElementById('editor-html'), {
    value: defaultHTML,
    language: 'html',
    theme: 'vs-dark',
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2
  });

  // Create CSS Editor
  editorCSS = monaco.editor.create(document.getElementById('editor-css'), {
    value: defaultCSS,
    language: 'css',
    theme: 'vs-dark',
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2
  });

  // Create Python Editor
  editorPython = monaco.editor.create(document.getElementById('editor-python'), {
    value: defaultPython,
    language: 'python',
    theme: 'vs-dark',
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4
  });

  // Initialize UI
  renderSnippets();
  renderTemplates();
  renderApiReference();
  initResizer();
  
  // Load sidebar state from localStorage
  loadSidebarState();
  
  // Load saved code if exists
  loadSavedCode();
  
  // Initial preview
  setTimeout(runPreview, 500);
});

// Initialize Grist
grist.ready({ requiredAccess: 'full' });

grist.onRecords(function(recs, mappings) {
  records = recs || [];
  document.getElementById('status-records').textContent = records.length + ' enregistrements';
});

// Get table name when available
grist.onRecord(function(record) {
  if (record && record.id) {
    document.getElementById('status-table').textContent = 'Table connectée';
  }
});

// Get columns
grist.onRecords(function(recs) {
  if (recs && recs.length > 0) {
    columns = Object.keys(recs[0]).filter(function(k) { return k !== 'id'; });
    renderColumns();
  }
});

// Load saved options
grist.onOptions(function(options) {
  if (options && options._installed) {
    isInstalled = true;
    if (options._js) editorJS && editorJS.setValue(options._js);
    if (options._html) editorHTML && editorHTML.setValue(options._html);
    if (options._css) editorCSS && editorCSS.setValue(options._css);
    if (options._python) editorPython && editorPython.setValue(options._python);
    document.getElementById('status-saved').textContent = 'Installé ✓';
  }
});

// =============================================================================
// UI FUNCTIONS
// =============================================================================

function switchView(view) {
  document.querySelectorAll('.header-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  
  if (view === 'preview-only') {
    document.querySelector('.sidebar').style.display = 'none';
    document.querySelector('.editor-area').style.display = 'none';
    document.getElementById('preview-area').style.width = '100%';
  } else {
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.editor-area').style.display = 'flex';
    document.getElementById('preview-area').style.width = '50%';
  }
}

function switchEditorTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.editor-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.editor-pane').forEach(function(p) {
    p.classList.toggle('active', p.id === 'pane-' + tab);
  });
}

function toggleSection(header) {
  var content = header.nextElementSibling;
  var icon = header.querySelector('.toggle-icon');
  content.classList.toggle('collapsed');
  icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
  
  // Save sidebar state
  saveSidebarState();
}

function saveSidebarState() {
  var state = {
    columns: !document.getElementById('columns-list').classList.contains('collapsed'),
    snippets: !document.getElementById('snippets-list').classList.contains('collapsed'),
    templates: !document.getElementById('templates-list').classList.contains('collapsed'),
    api: !document.getElementById('api-list').classList.contains('collapsed')
  };
  localStorage.setItem('codeEditorSidebarState', JSON.stringify(state));
}

function loadSidebarState() {
  try {
    var state = JSON.parse(localStorage.getItem('codeEditorSidebarState'));
    if (!state) return;
    
    var sections = [
      { id: 'columns-list', open: state.columns },
      { id: 'snippets-list', open: state.snippets },
      { id: 'templates-list', open: state.templates },
      { id: 'api-list', open: state.api }
    ];
    
    sections.forEach(function(s) {
      var content = document.getElementById(s.id);
      var header = content.previousElementSibling;
      var icon = header.querySelector('.toggle-icon');
      
      if (s.open) {
        content.classList.remove('collapsed');
        icon.textContent = '▼';
      } else {
        content.classList.add('collapsed');
        icon.textContent = '▶';
      }
    });
  } catch(e) {
    console.log('Could not load sidebar state');
  }
}

function toggleConsole() {
  var console = document.getElementById('console-area');
  console.style.display = console.style.display === 'none' ? 'flex' : 'none';
}

function clearConsole() {
  document.getElementById('console-output').innerHTML = '';
}

function logToConsole(type, ...args) {
  var output = document.getElementById('console-output');
  var time = new Date().toLocaleTimeString();
  var line = document.createElement('div');
  line.className = 'console-line ' + type;
  line.innerHTML = '<span class="console-time">' + time + '</span> ' + args.map(function(a) {
    return typeof a === 'object' ? JSON.stringify(a) : String(a);
  }).join(' ');
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

// =============================================================================
// RENDER FUNCTIONS
// =============================================================================

function renderColumns() {
  var html = '';
  columns.forEach(function(col) {
    var type = guessColumnType(col);
    html += '<div class="column-item" onclick="insertColumn(\'' + col + '\')">';
    html += '<span class="column-type ' + type + '">' + type.toUpperCase() + '</span>';
    html += '<span>' + col + '</span>';
    html += '</div>';
  });
  document.getElementById('columns-list').innerHTML = html || '<div style="color: var(--text-secondary); font-size: 11px; padding: 8px;">Aucune colonne</div>';
}

function guessColumnType(colName) {
  var name = colName.toLowerCase();
  if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('updated')) return 'date';
  if (name.includes('id') || name.includes('ref') || name.includes('_id')) return 'ref';
  if (name.includes('is_') || name.includes('has_') || name.includes('active') || name.includes('enabled')) return 'bool';
  if (name.includes('count') || name.includes('amount') || name.includes('price') || name.includes('qty') || name.includes('number')) return 'number';
  return 'text';
}

function insertColumn(col) {
  if (editorJS) {
    var position = editorJS.getPosition();
    editorJS.executeEdits('', [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: 'record.' + col
    }]);
    editorJS.focus();
  }
  showToast('Colonne insérée: ' + col, 'info');
}

function renderSnippets() {
  var html = '';
  snippets.forEach(function(s, i) {
    html += '<div class="snippet-item" onclick="applySnippet(' + i + ')">';
    html += '<div class="snippet-title">' + s.title + '</div>';
    html += '<div class="snippet-desc">' + s.desc + '</div>';
    html += '</div>';
  });
  document.getElementById('snippets-list').innerHTML = html;
}

function applySnippet(index) {
  var snippet = snippets[index];
  if (editorJS) editorJS.setValue(snippet.js);
  if (editorHTML) editorHTML.setValue(snippet.html);
  if (editorCSS) editorCSS.setValue(snippet.css || '');
  showToast('Snippet appliqué: ' + snippet.title, 'success');
  runPreview();
}

function renderTemplates() {
  var html = '';
  templates.forEach(function(t, i) {
    html += '<div class="template-item" onclick="applyTemplate(' + i + ')">';
    html += '<div class="template-icon">' + t.icon + '</div>';
    html += '<div class="template-title">' + t.title + '</div>';
    html += '</div>';
  });
  document.getElementById('templates-list').innerHTML = html;
}

function applyTemplate(index) {
  var template = templates[index];
  if (editorJS) editorJS.setValue(template.js);
  if (editorHTML) editorHTML.setValue(template.html);
  if (editorCSS) editorCSS.setValue(template.css);
  showToast('Template appliqué: ' + template.title, 'success');
  runPreview();
}

function renderApiReference() {
  var html = '';
  gristApiDefinitions.forEach(function(api) {
    html += '<div class="snippet-item" onclick="insertApiSnippet(\'' + api.name + '\')">';
    html += '<div class="snippet-title">' + api.name + '</div>';
    html += '<div class="snippet-desc">' + api.desc + '</div>';
    html += '</div>';
  });
  document.getElementById('api-list').innerHTML = html;
}

function insertApiSnippet(name) {
  var api = gristApiDefinitions.find(function(a) { return a.name === name; });
  if (api && editorJS) {
    var position = editorJS.getPosition();
    editorJS.executeEdits('', [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: api.snippet
    }]);
    editorJS.focus();
  }
  showToast('API insérée: ' + name, 'info');
}

// =============================================================================
// PREVIEW & INSTALL
// =============================================================================

function runPreview() {
  var jsCode = editorJS ? editorJS.getValue() : '';
  var htmlCode = editorHTML ? editorHTML.getValue() : '';
  var cssCode = editorCSS ? editorCSS.getValue() : '';
  
  // Inject CSS into HTML
  if (htmlCode.includes('<style id="custom-css">')) {
    htmlCode = htmlCode.replace('<style id="custom-css"></style>', '<style id="custom-css">' + cssCode + '</style>');
  } else if (htmlCode.includes('</head>')) {
    htmlCode = htmlCode.replace('</head>', '<style>' + cssCode + '</style></head>');
  }
  
  // Add Grist API and custom JS
  var fullHTML = htmlCode.replace('</body>', 
    '<script src="https://docs.getgrist.com/grist-plugin-api.js"><\/script>' +
    '<script>' + jsCode + '<\/script>' +
    '</body>'
  );
  
  // Create blob and load in iframe
  var blob = new Blob([fullHTML], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  
  var frame = document.getElementById('preview-frame');
  frame.src = url;
  
  // Intercept console
  frame.onload = function() {
    try {
      var win = frame.contentWindow;
      var origLog = win.console.log;
      var origWarn = win.console.warn;
      var origError = win.console.error;
      var origInfo = win.console.info;
      
      win.console.log = function() { logToConsole('log', ...arguments); origLog.apply(win.console, arguments); };
      win.console.warn = function() { logToConsole('warn', ...arguments); origWarn.apply(win.console, arguments); };
      win.console.error = function() { logToConsole('error', ...arguments); origError.apply(win.console, arguments); };
      win.console.info = function() { logToConsole('info', ...arguments); origInfo.apply(win.console, arguments); };
    } catch(e) {}
  };
  
  showToast('Aperçu mis à jour', 'info');
}

function resetCode() {
  if (editorJS) editorJS.setValue(defaultJS);
  if (editorHTML) editorHTML.setValue(defaultHTML);
  if (editorCSS) editorCSS.setValue(defaultCSS);
  if (editorPython) editorPython.setValue(defaultPython);
  showToast('Code réinitialisé', 'info');
  runPreview();
}

async function installWidget() {
  var jsCode = editorJS ? editorJS.getValue() : '';
  var htmlCode = editorHTML ? editorHTML.getValue() : '';
  var cssCode = editorCSS ? editorCSS.getValue() : '';
  var pythonCode = editorPython ? editorPython.getValue() : '';
  
  try {
    await grist.setOptions({
      _installed: true,
      _js: jsCode,
      _html: htmlCode,
      _css: cssCode,
      _python: pythonCode
    });
    
    isInstalled = true;
    document.getElementById('status-saved').textContent = 'Installé ✓';
    showToast('Widget installé avec succès !', 'success');
  } catch(e) {
    showToast('Erreur: ' + e.message, 'error');
  }
}

function loadSavedCode() {
  // Code is loaded via grist.onOptions
}

// =============================================================================
// RESIZER
// =============================================================================

function initResizer() {
  var resizer = document.getElementById('resizer');
  var editorArea = document.querySelector('.editor-area');
  var previewArea = document.getElementById('preview-area');
  var isResizing = false;
  
  resizer.addEventListener('mousedown', function(e) {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    var containerWidth = document.querySelector('.main-content').offsetWidth - 280; // minus sidebar
    var newEditorWidth = e.clientX - 280;
    var editorPercent = (newEditorWidth / containerWidth) * 100;
    editorPercent = Math.max(20, Math.min(80, editorPercent));
    editorArea.style.flex = '0 0 ' + editorPercent + '%';
    previewArea.style.width = (100 - editorPercent) + '%';
  });
  
  document.addEventListener('mouseup', function() {
    isResizing = false;
    document.body.style.cursor = '';
  });
}

// =============================================================================
// TOAST
// =============================================================================

function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = message;
  container.appendChild(toast);
  
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}
