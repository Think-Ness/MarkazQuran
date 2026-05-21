# 🚀 Smart Architecture Implementation Guide
## How to Use the New Features

---

## 📁 New Modules Created

### 1. **Data Store** (`datastore.js`)
Centralized state management with transaction tracking and undo/redo.

#### Usage:
```javascript
import { dataStore } from './datastore.js';

// Set data with validation
dataStore.set('santri', santriArray, skipValidation = false);

// Get data
const santri = dataStore.get('santri');

// Find by ID (supports multiple ID types)
const item = dataStore.getById('santri', 'STM001');

// Subscribe to changes
const unsubscribe = dataStore.subscribe('santri', (data) => {
  console.log('Santri updated:', data);
});

// Undo/Redo
dataStore.undo();
dataStore.redo();
```

---

### 2. **Validation Engine** (`validation.js`)
Prevents invalid data from being saved with comprehensive error reporting.

#### Pre-defined Rules Available:
- `santri` - Student data validation
- `guru` - Teacher data validation
- `tesBacaan` - Reading test validation
- `hafalan` - Memorization validation
- `sesiUjian` - Exam session validation
- `rapot` - Report card validation

#### Usage:
```javascript
import { validator, VALIDATION_RULES, validateWorkflow } from './validation.js';

// Register rules for a collection
validator.registerRules('santri', VALIDATION_RULES.santri);

// Validate single item
const result = validator.validateItem('santri', santriData);
if (!result.isValid) {
  console.error('Errors:', result.errors);
  // result.errors = [{ field: 'Nama', message: '...', value: '...' }]
}

// Validate entire collection
const collectionResult = validator.validateCollection('tesBacaan', allTes);

// Validate workflow readiness
const ready = validateWorkflow('sesiUjian->rapot', { peserta, materi });
```

---

### 3. **Workflow Engine** (`workflow.js`)
Intelligent automation for generating templates, calculating scores, and detecting patterns.

#### Key Functions:

##### Auto-Generate Evaluation Template
```javascript
import { WorkflowEngine } from './workflow.js';

// Pre-fills evaluation form from session data
const template = WorkflowEngine.generateEvaluationTemplate(
  sessionObj, 
  santriObj, 
  'bacaan' // or 'hafalan'
);

// Returns: {
//   SesiID, Tanggal, PenanggungJawab, STambuk, Nama, Kelas, ...
//   Indikator: { Ind1: 0, Ind2: 0, ... } // pre-filled with zeros
// }
```

##### Calculate Smart Score
```javascript
// Calculates score from error indicators
// Formula: 100 - (totalErrors × 2)
const score = WorkflowEngine.calculateFinalScore(indicators);

// indicators = { Ind1: 2, Ind2: 1, ... }
// Returns: 94
```

##### Detect Remedial Cases
```javascript
// Analyzes if student needs remediation
const remedial = WorkflowEngine.detectRemedialCase(
  latestScore,  // current score
  [85, 80, 75]  // all previous scores
);

// Returns:
// {
//   isRemedial: true,
//   latestScore: 75,
//   threshold: 70,
//   trend: -5,      // negative = declining
//   recommendations: ['Nilai menurun - perlu perhatian lebih', ...]
// }
```

##### Generate Smart Rapot Data
```javascript
// Auto-fills rapot with best scores and calculations
const rapotData = WorkflowEngine.generateRapotData(
  santriObj,
  allTesBacaan,
  allHafalan,
  configObj
);

// Returns complete rapot data with calculations
```

---

### 4. **Enhanced Utilities** (`enhanced-utils.js`)
High-level helpers built on top of core modules.

#### Smart Calculations:
```javascript
import { 
  getRemediaiRecommendation,
  calculateScoreFromIndicators,
  filterRemedial,
  getEvaluationStats
} from './enhanced-utils.js';

// Get remedial status with recommendations
const rec = getRemediaiRecommendation(latestScore, allScores);
// { status: 'remedial', badge: HTML, message, recommendations, trend }

// Filter students needing remediation
const remedialStudents = filterRemedial(allEvaluations, threshold = 70);

// Get statistics
const stats = getEvaluationStats(evaluations);
// { avg, min, max, remedial, total }
```

#### Workflow Helpers:
```javascript
// Check if workflow is ready
const readiness = checkWorkflowReadiness('session-evaluation', {
  sessionId: 'S001',
  hasMateri: true,
  participantCount: 10,
  allEvaluated: false
});
// { ready: false, msg: '... peserta belum dievaluasi' }

// Generate workflow checklist
const checklist = generateWorkflowChecklist('rapot-creation', {
  santriId: 'STM001',
  periode: 'Semester 1',
  nilaiAkhir: 85,
  hasHafalan: true
});
// { checklist: [...], allDone: false, remaining: 1, html: '...' }

// Get smart alerts
const alerts = getSmartAlerts(context);
// Shows: unassessed students, remedial cases, etc.
```

---

## 🎯 Integration Examples

### Example 1: Improve an Existing Form

**Before:**
```javascript
async function saveSantri() {
  if (!name) return showToast('Nama harus diisi', 'error');
  if (!kelas) return showToast('Kelas harus diisi', 'error');
  // ... many simple checks
}
```

**After:**
```javascript
import { validator, VALIDATION_RULES } from './validation.js';

async function saveSantri() {
  const data = { Nama: name, Kelas: kelas, ... };
  
  // Single comprehensive validation
  const result = validator.validateItem('santri', data);
  if (!result.isValid) {
    const errorMsg = result.errors
      .map(e => `${e.field}: ${e.message}`)
      .join('\n');
    return showToast(errorMsg, 'error');
  }
  
  // Proceed with save
  await api('addSantri', data);
}
```

---

### Example 2: Add Auto-Population to Evaluation Form

**Before:**
```javascript
window.openEvaluationModal = (stambuk) => {
  // User must manually fill: tanggal, guru, materi, etc.
  document.getElementById('evalDate').value = '';
  document.getElementById('evalGuru').value = '';
};
```

**After:**
```javascript
import { getEvaluationTemplate } from './enhanced-utils.js';

window.openEvaluationModal = (stambuk) => {
  const template = getEvaluationTemplate(session, santri, type);
  
  // All fields pre-populated!
  document.getElementById('evalDate').value = template.Tanggal;
  document.getElementById('evalGuru').value = template.PenanggungJawab;
  document.getElementById('evalSurah').value = template.SurahTarget;
  // ... etc
};
```

---

### Example 3: Add Remedial Detection

**Before:**
```javascript
// Manually check each score
if (score < 70) {
  showAlert('Perlu pembinaan');
}
```

**After:**
```javascript
import { getRemediaiRecommendation } from './enhanced-utils.js';

const allScores = [85, 80, 75, 68]; // progression
const recommendation = getRemediaiRecommendation(68, allScores);

if (recommendation.status === 'remedial') {
  showAlert(
    recommendation.message + '\n' +
    recommendation.recommendations.join('\n') + '\n' +
    'Trend: ' + recommendation.trend
  );
}
```

---

### Example 4: Add Smart Alerts to Dashboard

**Before:**
```javascript
// Dashboard shows generic stats
totalSantri: 150
evaluatedSantri: 145
// No actionable insights
```

**After:**
```javascript
import { getSmartAlerts } from './enhanced-utils.js';

const alerts = getSmartAlerts({
  santri: allSantri,
  tesBacaan: allTes,
  hafalan: allHafalan
});

// Returns alerts like:
// ⚠ 5 Santri Belum Dievaluasi
// 🔔 12 Kasus Remedial

alerts.forEach(alert => {
  showAlertBanner(alert.icon + ' ' + alert.title, alert.type);
});
```

---

## 📋 Quick Reference: Using the Smart Modules

### For Form Validation:
```
1. Import validator and rules
2. Call validator.validateItem(type, data)
3. Check result.isValid
4. Show result.errors if needed
```

### For Auto-Population:
```
1. Get template: WorkflowEngine.generateEvaluationTemplate(...)
2. Set form fields from template values
3. Show hint: "Data sudah dipopulasi otomatis"
```

### For Calculations:
```
1. Import helper function (calculateScoreFromIndicators, etc)
2. Call with data
3. Use result for display/validation
```

### For Workflow Checks:
```
1. Call checkWorkflowReadiness(workflow, context)
2. If not ready, show user the missing items
3. If ready, proceed with operation
```

---

## 🔄 Migration Path: Making Existing Pages Smart

### Step 1: Add Imports
```javascript
import { 
  validator, VALIDATION_RULES,
  WorkflowEngine, SmartSuggestions,
  checkWorkflowReadiness, calculateScoreFromIndicators
} from '../enhanced-utils.js';
```

### Step 2: Improve Validation
- Replace inline checks with `validator.validateItem()`
- Show comprehensive error messages from `result.errors`

### Step 3: Add Auto-Population
- Use `getEvaluationTemplate()` when opening forms
- Pre-fill fields from session/context data

### Step 4: Add Progress Tracking
- Use `getProgressBar()` to show completion status
- Show `checkWorkflowReadiness()` warnings before save

### Step 5: Add Smart Suggestions
- Use `getSmartAlerts()` on dashboard
- Show `getNextActionSuggestions()` in context

---

## ✅ Checklist for Each Page Update

- [ ] Import enhanced utilities
- [ ] Add validation to forms before save
- [ ] Show detailed error messages
- [ ] Auto-populate data from context
- [ ] Check workflow readiness before major operations
- [ ] Show progress indicators
- [ ] Add smart alerts relevant to page
- [ ] Test with invalid data
- [ ] Test undo/redo if using DataStore

---

## 🐛 Debugging Tips

### Check Validation Issues:
```javascript
const result = validator.validateItem('santri', data);
console.log('Valid:', result.isValid);
console.log('Errors:', result.errors);
```

### Check Calculation:
```javascript
const indicators = { Ind1: 2, Ind2: 1, Ind3: 0, ... };
const score = calculateScoreFromIndicators(indicators);
console.log('Score:', score, '= 100 - (' + totalErrors + ' × 2)');
```

### Monitor State Changes:
```javascript
const unsub = dataStore.subscribe('santri', (data) => {
  console.log('Santri changed:', data);
});
// Later: unsub(); to stop monitoring
```

---

## 📊 Performance Notes

- **DataStore**: In-memory, optimized for <5000 records
- **Validator**: O(n×m) where n=items, m=rules. Use selectively
- **WorkflowEngine**: Stateless functions, very fast
- **Enhanced Utils**: Wrappers around above, no overhead

---

## 🎓 Next Steps

1. **Update Rapot Page** - Add workflow validation before print
2. **Update Tes Bacaan Page** - Add remedial detection and alerts
3. **Update Dashboard** - Add smart alerts and next-action suggestions
4. **Create Smart Filters** - Filter by remedial status, evaluation status, etc.
5. **Add Data Export** - Export with calculated fields

---

*Last Updated: 2026-05-22*
*Architecture Version: 1.0*
