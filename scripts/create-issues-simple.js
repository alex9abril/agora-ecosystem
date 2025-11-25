#!/usr/bin/env node

/**
 * Script simple para crear issues en GitHub
 * Requiere: Node.js y GitHub CLI (gh)
 * 
 * Uso: node scripts/create-issues-simple.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Creando issues para LOCALIA Project\n');

// Verificar que gh está instalado
try {
    execSync('gh --version', { stdio: 'ignore' });
} catch (error) {
    console.error('❌ GitHub CLI (gh) no está instalado');
    console.log('Instala desde: https://cli.github.com/');
    process.exit(1);
}

// Verificar autenticación
try {
    execSync('gh auth status', { stdio: 'ignore' });
} catch (error) {
    console.error('⚠️  No estás autenticado en GitHub CLI');
    console.log('Ejecuta: gh auth login');
    process.exit(1);
}

// Leer el CSV
const csvPath = 'docs/github-projects-import.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Skip header
const issues = lines.slice(1).map(line => {
    // Parse CSV (simple, asume formato correcto)
    const matches = line.match(/"(.*?)","(.*?)","(.*?)","(.*?)","(.*?)","(.*?)","(.*?)"/);
    if (!matches) return null;
    
    return {
        title: matches[1],
        body: matches[2],
        labels: matches[3],
        status: matches[4],
        week: matches[5],
        developer: matches[6],
        priority: matches[7]
    };
}).filter(Boolean);

console.log(`📋 Encontradas ${issues.length} issues para crear\n`);

// Crear issues
let created = 0;
let errors = 0;

issues.forEach((issue, index) => {
    const fullBody = `## Descripción
${issue.body}

## Semana
${issue.week}

## Desarrollador
${issue.developer}

## Prioridad
${issue.priority}

---
*Creado automáticamente desde el plan de proyecto*`;

    try {
        console.log(`[${index + 1}/${issues.length}] 📝 Creando: ${issue.title}`);
        
        const command = `gh issue create --title "${issue.title}" --body "${fullBody.replace(/"/g, '\\"')}" --label "${issue.labels}" --repo alex9abril/localia-admin`;
        
        execSync(command, { stdio: 'ignore' });
        created++;
        console.log(`✅ Creada exitosamente\n`);
        
        // Pausa para no sobrecargar la API
        if (index < issues.length - 1) {
            setTimeout(() => {}, 500);
        }
    } catch (error) {
        errors++;
        console.error(`❌ Error creando: ${issue.title}`);
        console.error(`   ${error.message}\n`);
    }
});

console.log('\n✨ Proceso completado');
console.log(`✅ Issues creadas: ${created}`);
console.log(`❌ Errores: ${errors}`);
console.log('\n💡 Ahora puedes agregar estas issues a tu proyecto de GitHub');
console.log('   Ve a: https://github.com/users/alex9abril/projects/2');
console.log('   Haz clic en "Add item" y busca las issues creadas');

