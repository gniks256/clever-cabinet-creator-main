import fs from 'fs';

const content = fs.readFileSync('./src/components/configurator/ConfigSidebar.tsx', 'utf-8');
const counterStr = content.substring(content.indexOf('label="По ширине"'), content.indexOf('label="По ширине"') + 1000);
console.log(counterStr);
