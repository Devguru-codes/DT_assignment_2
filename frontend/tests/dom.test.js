import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Frontend DOM Validations', () => {
    let adminDom, managerDom, employeeDom;

    beforeAll(() => {
        const root = path.resolve(__dirname, '..');
        const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf-8');
        const managerHtml = fs.readFileSync(path.join(root, 'manager.html'), 'utf-8');
        const employeeHtml = fs.readFileSync(path.join(root, 'employee.html'), 'utf-8');

        adminDom = new JSDOM(adminHtml);
        managerDom = new JSDOM(managerHtml);
        employeeDom = new JSDOM(employeeHtml);
    });

    it('should have a form for admin override logic', () => {
        const form = adminDom.window.document.querySelector('form');
        expect(form).not.toBeNull();
        const textarea = form.querySelector('textarea');
        expect(textarea).not.toBeNull();
    });

    it('should have a queue container space in manager dashboard', () => {
        const queue = managerDom.window.document.querySelector('.space-y-4');
        expect(queue).not.toBeNull();
    });

    it('should have a table body for requests in employee dashboard', () => {
        const tbody = employeeDom.window.document.querySelector('tbody');
        expect(tbody).not.toBeNull();
    });
});
