import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ArticleBlock, BlockType } from '../../models/blocks.model';

@Component({
  selector: 'app-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="block-editor-container">
      <div class="blocks-list" *ngIf="blocks && blocks.length > 0" cdkDropList (cdkDropListDropped)="drop($event)">
        <div class="block-item" *ngFor="let block of blocks; let i = index" cdkDrag>
          <div class="block-header">
            <div class="drag-handle" cdkDragHandle title="Drag to reorder">
              <svg width="24px" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"></path>
              </svg>
            </div>
            <span class="block-type-badge">{{ block.type | uppercase }}</span>
            <div class="block-controls">
              <button type="button" class="icon-btn" (click)="duplicateBlock(i)" title="Duplicate Block">⧉</button>
              <button type="button" class="icon-btn delete-btn" (click)="removeBlock(i)" title="Delete Block">✕</button>
            </div>
          </div>
          
          <div class="block-content">
            <!-- HEADING BLOCK -->
            <div *ngIf="block.type === 'heading'" class="block-form">
              <select [(ngModel)]="block.data.level" class="form-control mb-2">
                <option [ngValue]="1">H1 - Main Title</option>
                <option [ngValue]="2">H2 - Section Heading</option>
                <option [ngValue]="3">H3 - Sub-section</option>
                <option [ngValue]="4">H4 - Minor Heading</option>
              </select>
              <input type="text" [(ngModel)]="block.data.text" placeholder="Heading Text" class="form-control" />
            </div>

            <!-- PARAGRAPH BLOCK -->
            <div *ngIf="block.type === 'paragraph'" class="block-form">
              <textarea [(ngModel)]="block.data.text" placeholder="Paragraph text (HTML allowed)" class="form-control" rows="4"></textarea>
            </div>

            <!-- IMAGE BLOCK -->
            <div *ngIf="block.type === 'image'" class="block-form">
              <div class="d-flex mb-2" style="gap: 10px; align-items: center;">
                <input type="text" [(ngModel)]="block.data.url" placeholder="Image URL (or upload file)" class="form-control" style="flex-grow: 1;" />
                <input type="file" accept="image/*" (change)="onImageBlockUpload($event, block)" style="display: none;" #imgUpload>
                <button type="button" class="btn secondary-btn" style="white-space: nowrap;" (click)="imgUpload.click()" [disabled]="block._uploading">
                  {{ block._uploading ? 'Processing...' : '📁 Upload' }}
                </button>
              </div>
              <input type="text" [(ngModel)]="block.data.caption" placeholder="Caption (optional)" class="form-control mb-2" />
              <input type="text" [(ngModel)]="block.data.alt" placeholder="Alt text (for SEO)" class="form-control" />
            </div>

            <!-- TABLE BLOCK -->
            <div *ngIf="block.type === 'table'" class="block-form">
              <label class="checkbox-label mb-2">
                <input type="checkbox" [(ngModel)]="block.data.withHeadings" /> First row is Header
              </label>
              
              <div class="table-editor-grid">
                <div *ngFor="let row of block.data.content; let rIndex = index" class="table-row">
                  <div *ngFor="let cell of row; let cIndex = index; trackBy: trackByIndex" class="table-cell">
                    <input type="text" [(ngModel)]="block.data.content[rIndex][cIndex]" class="form-control" placeholder="Cell content..." />
                    <button *ngIf="block.data.content.length > 1 && cIndex === row.length - 1" type="button" (click)="removeTableRow(block, rIndex)" class="icon-btn delete-btn ml-2" title="Remove Row">✕</button>
                  </div>
                </div>
              </div>
              <div class="table-controls mt-2">
                <button type="button" class="btn secondary-btn" (click)="addTableRow(block)">+ Add Row</button>
                <button type="button" class="btn secondary-btn ml-2" (click)="addTableColumn(block)">+ Add Column</button>
                <button *ngIf="block.data.content && block.data.content[0] && block.data.content[0].length > 1" type="button" class="btn secondary-btn ml-2" (click)="removeTableColumn(block)">- Remove Column</button>
              </div>
            </div>

            <!-- COMPARISON BLOCK -->
            <div *ngIf="block.type === 'comparison'" class="block-form">
              <div *ngFor="let card of block.data.items; let cIndex = index" class="comparison-card-editor mb-3">
                <div class="d-flex justify-between mb-2">
                  <h4>Card {{cIndex + 1}}</h4>
                  <button type="button" (click)="removeComparisonCard(block, cIndex)" class="icon-btn delete-btn">✕</button>
                </div>
                <input type="text" [(ngModel)]="card.title" placeholder="Card Title (e.g. Tesla Model 3)" class="form-control mb-2" />
                <input type="text" [(ngModel)]="card.image" placeholder="Image URL (optional)" class="form-control mb-2" />
                <input type="text" [(ngModel)]="card.highlight" placeholder="Highlight text (e.g. Best Range)" class="form-control mb-2" />
                
                <h5>Specs</h5>
                <div *ngFor="let spec of card.specs; let sIndex = index" class="spec-row mb-2">
                  <input type="text" [(ngModel)]="spec.label" placeholder="Label (e.g. Range)" class="form-control spec-input" />
                  <input type="text" [(ngModel)]="spec.value" placeholder="Value (e.g. 500 km)" class="form-control spec-input ml-2" />
                  <button type="button" (click)="removeComparisonSpec(card, sIndex)" class="icon-btn delete-btn ml-2">✕</button>
                </div>
                <button type="button" (click)="addComparisonSpec(card)" class="btn secondary-btn sm-btn">+ Add Spec</button>
              </div>
              <button type="button" (click)="addComparisonCard(block)" class="btn secondary-btn">+ Add Comparison Card</button>
            </div>

            <!-- CALLOUT BLOCK -->
            <div *ngIf="block.type === 'callout'" class="block-form">
              <select [(ngModel)]="block.data.style" class="form-control mb-2">
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Yellow)</option>
                <option value="success">Success (Green)</option>
                <option value="danger">Danger (Red)</option>
              </select>
              <input type="text" [(ngModel)]="block.data.icon" placeholder="Emoji or Icon (e.g. 💡)" class="form-control mb-2" />
              <textarea [(ngModel)]="block.data.text" placeholder="Callout text" class="form-control" rows="3"></textarea>
            </div>

            <!-- FAQ BLOCK -->
            <div *ngIf="block.type === 'faq'" class="block-form">
              <div *ngFor="let faq of block.data.items; let fIndex = index" class="faq-editor mb-3">
                <div class="d-flex justify-between mb-2">
                  <input type="text" [(ngModel)]="faq.question" placeholder="Question" class="form-control flex-grow" />
                  <button type="button" (click)="removeFaqItem(block, fIndex)" class="icon-btn delete-btn ml-2">✕</button>
                </div>
                <textarea [(ngModel)]="faq.answer" placeholder="Answer" class="form-control" rows="2"></textarea>
              </div>
              <button type="button" (click)="addFaqItem(block)" class="btn secondary-btn">+ Add FAQ</button>
            </div>

            <!-- PROS CONS BLOCK -->
            <div *ngIf="block.type === 'pros-cons'" class="block-form">
              <div class="pros-cons-grid">
                <div class="pros-column">
                  <h4 class="text-success">Pros</h4>
                  <div *ngFor="let pro of block.data.pros; let pIndex = index; trackBy: trackByIndex" class="d-flex mb-2">
                    <input type="text" [(ngModel)]="block.data.pros[pIndex]" class="form-control" />
                    <button type="button" (click)="removePro(block, pIndex)" class="icon-btn delete-btn ml-2">✕</button>
                  </div>
                  <button type="button" (click)="addPro(block)" class="btn secondary-btn sm-btn">+ Add Pro</button>
                </div>
                <div class="cons-column">
                  <h4 class="text-danger">Cons</h4>
                  <div *ngFor="let con of block.data.cons; let cIndex = index; trackBy: trackByIndex" class="d-flex mb-2">
                    <input type="text" [(ngModel)]="block.data.cons[cIndex]" class="form-control" />
                    <button type="button" (click)="removeCon(block, cIndex)" class="icon-btn delete-btn ml-2">✕</button>
                  </div>
                  <button type="button" (click)="addCon(block)" class="btn secondary-btn sm-btn">+ Add Con</button>
                </div>
              </div>
            </div>

            <!-- LIST BLOCK -->
            <div *ngIf="block.type === 'list'" class="block-form">
              <select [(ngModel)]="block.data.style" class="form-control mb-2">
                <option value="unordered">Unordered (Bullets)</option>
                <option value="ordered">Ordered (Numbers)</option>
              </select>
              <div *ngFor="let item of block.data.items; let lIndex = index; trackBy: trackByIndex" class="d-flex mb-2">
                <input type="text" [(ngModel)]="block.data.items[lIndex]" class="form-control" />
                <button type="button" (click)="removeListItem(block, lIndex)" class="icon-btn delete-btn ml-2">✕</button>
              </div>
              <button type="button" (click)="addListItem(block)" class="btn secondary-btn">+ Add List Item</button>
            </div>

            <!-- QUOTE BLOCK -->
            <div *ngIf="block.type === 'quote'" class="block-form">
              <textarea [(ngModel)]="block.data.text" placeholder="Quote text..." class="form-control mb-2" rows="3"></textarea>
              <input type="text" [(ngModel)]="block.data.author" placeholder="Author (optional)" class="form-control" />
            </div>

            <!-- DIVIDER BLOCK -->
            <div *ngIf="block.type === 'divider'" class="block-form text-center py-3">
              <hr style="border-top: 2px dashed rgba(255,255,255,0.2);" />
              <span class="text-muted">Divider</span>
            </div>

            <!-- CTA BLOCK -->
            <div *ngIf="block.type === 'cta'" class="block-form">
              <input type="text" [(ngModel)]="block.data.text" placeholder="CTA Message" class="form-control mb-2" />
              <input type="text" [(ngModel)]="block.data.buttonText" placeholder="Button Text" class="form-control mb-2" />
              <input type="text" [(ngModel)]="block.data.url" placeholder="Destination URL" class="form-control mb-2" />
              <select [(ngModel)]="block.data.style" class="form-control">
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </div>

            <!-- RELATED CONTENT BLOCK -->
            <div *ngIf="block.type === 'related'" class="block-form">
              <div *ngFor="let rel of block.data.articleIds; let rIndex = index; trackBy: trackByIndex" class="d-flex mb-2">
                <input type="text" [(ngModel)]="block.data.articleIds[rIndex]" placeholder="Article ID" class="form-control" />
                <button type="button" (click)="removeRelatedItem(block, rIndex)" class="icon-btn delete-btn ml-2">✕</button>
              </div>
              <button type="button" (click)="addRelatedItem(block)" class="btn secondary-btn">+ Add Related Article</button>
            </div>

            <!-- STATISTICS BLOCK -->
            <div *ngIf="block.type === 'statistics'" class="block-form">
              <div class="statistics-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div *ngFor="let stat of block.data.items; let sIndex = index" class="stat-editor mb-3" style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                  <div class="d-flex justify-between mb-2">
                    <h5>Stat {{sIndex + 1}}</h5>
                    <button type="button" (click)="removeStatisticItem(block, sIndex)" class="icon-btn delete-btn">✕</button>
                  </div>
                  <input type="text" [(ngModel)]="stat.value" placeholder="Value (e.g. 500 km)" class="form-control mb-2" />
                  <input type="text" [(ngModel)]="stat.label" placeholder="Label (e.g. Certified Range)" class="form-control mb-2" />
                  <input type="text" [(ngModel)]="stat.icon" placeholder="Icon Emoji (optional)" class="form-control" />
                </div>
              </div>
              <button type="button" (click)="addStatisticItem(block)" class="btn secondary-btn mt-2">+ Add Statistic</button>
            </div>

            <!-- TIMELINE BLOCK -->
            <div *ngIf="block.type === 'timeline'" class="block-form">
              <div *ngFor="let event of block.data.events; let eIndex = index" class="timeline-editor mb-3" style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border-left: 3px solid #38bdf8;">
                <div class="d-flex justify-between mb-2">
                  <input type="text" [(ngModel)]="event.date" placeholder="Date / Year (e.g. 2024)" class="form-control flex-grow" style="max-width: 150px; font-weight: bold;" />
                  <button type="button" (click)="removeTimelineEvent(block, eIndex)" class="icon-btn delete-btn ml-2">✕</button>
                </div>
                <input type="text" [(ngModel)]="event.title" placeholder="Event Title" class="form-control mb-2" />
                <textarea [(ngModel)]="event.description" placeholder="Description" class="form-control" rows="2"></textarea>
              </div>
              <button type="button" (click)="addTimelineEvent(block)" class="btn secondary-btn">+ Add Event</button>
            </div>

            <!-- GALLERY BLOCK -->
            <div *ngIf="block.type === 'gallery'" class="block-form">
              <select [(ngModel)]="block.data.columns" class="form-control mb-3">
                <option [ngValue]="2">2 Columns</option>
                <option [ngValue]="3">3 Columns</option>
                <option [ngValue]="4">4 Columns</option>
              </select>
              <div *ngFor="let img of block.data.images; let iIndex = index" class="gallery-editor mb-3 d-flex" style="gap: 10px; align-items: flex-start;">
                <div style="flex-grow: 1;">
                  <div class="d-flex mb-1" style="gap: 10px; align-items: center;">
                    <input type="text" [(ngModel)]="img.url" placeholder="Image URL (or upload)" class="form-control" style="flex-grow: 1;" />
                    <input type="file" accept="image/*" (change)="onGalleryImageUpload($event, img, block)" style="display: none;" #galUpload>
                    <button type="button" class="btn secondary-btn sm-btn" style="white-space: nowrap;" (click)="galUpload.click()" [disabled]="img._uploading">
                      {{ img._uploading ? '...' : '📁 Upload' }}
                    </button>
                  </div>
                  <input type="text" [(ngModel)]="img.caption" placeholder="Caption (optional)" class="form-control mb-1" />
                  <input type="text" [(ngModel)]="img.alt" placeholder="Alt Text (optional)" class="form-control" />
                </div>
                <button type="button" (click)="removeGalleryImage(block, iIndex)" class="icon-btn delete-btn">✕</button>
              </div>
              <button type="button" (click)="addGalleryImage(block)" class="btn secondary-btn">+ Add Image</button>
            </div>
          </div>
        </div>
      </div>
      
      <div *ngIf="!blocks || blocks.length === 0" class="empty-state">
        <p>No blocks added yet. Start writing your article!</p>
      </div>

      <div class="add-block-menu">
        <select #newBlockType class="form-control block-select">
          <option value="paragraph">Paragraph</option>
          <option value="heading">Heading</option>
          <option value="image">Image</option>
          <option value="table">Table</option>
          <option value="comparison">Comparison Cards</option>
          <option value="callout">Callout</option>
          <option value="faq">FAQ</option>
          <option value="pros-cons">Pros & Cons</option>
          <option value="list">List</option>
          <option value="quote">Quote</option>
          <option value="cta">Call to Action</option>
          <option value="related">Related Content</option>
          <option value="divider">Divider</option>
          <option value="statistics">Statistics Cards</option>
          <option value="timeline">Timeline</option>
          <option value="gallery">Image Gallery</option>
        </select>
        <button type="button" class="btn primary-btn ml-2" (click)="addBlock(newBlockType.value)">+ Add Block</button>
      </div>
    </div>
  `,
  styles: [`
    .block-editor-container {
      width: 100%;
      background: #0D1418;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 20px;
    }
    .blocks-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 20px;
    }
    .block-item {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        margin-bottom: 24px;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .block-item.cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    }
    .block-item.cdk-drag-placeholder {
      opacity: 0.3;
    }
    .block-item.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .blocks-list.cdk-drop-list-dragging .block-item:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .block-header {
      background: #0f172a;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
    }
    .drag-handle {
      color: #94a3b8;
      cursor: grab;
      margin-right: 12px;
      display: flex;
      align-items: center;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .block-type-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      flex-grow: 1;
    }
    .block-controls {
      display: flex;
      gap: 8px;
    }
    .icon-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .icon-btn:hover:not([disabled]) {
      background: #334155;
      color: #f8fafc;
    }
    .icon-btn[disabled] {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .delete-btn:hover {
      background: rgba(239, 68, 68, 0.1) !important;
      color: #ef4444 !important;
    }
    .block-content {
      padding: 20px;
    }
    .form-control {
      width: 100%;
      padding: 10px 12px;
      background: #0D1418;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: white;
      font-size: 0.95rem;
      box-sizing: border-box;
    }
    .form-control:focus {
      border-color: #00D4FF;
      outline: none;
    }
    .mb-2 { margin-bottom: 10px; }
    .mb-3 { margin-bottom: 15px; }
    .mt-2 { margin-top: 10px; }
    .ml-2 { margin-left: 10px; }
    .py-3 { padding-top: 15px; padding-bottom: 15px; }
    .d-flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .flex-grow { flex-grow: 1; }
    .text-center { text-align: center; }
    .text-muted { color: #A8B2B2; }
    .text-success { color: #48BB78; margin-bottom: 10px; }
    .text-danger { color: #F56565; margin-bottom: 10px; }
    
    .btn {
      padding: 10px 16px;
      border-radius: 6px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .primary-btn {
      background: #00D4FF;
      color: #0D1418;
    }
    .secondary-btn {
      background: #2D3748;
      color: white;
    }
    .sm-btn {
      padding: 6px 12px;
      font-size: 0.8rem;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #A8B2B2;
      border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .add-block-menu {
      display: flex;
      background: #1A252A;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid rgba(0, 212, 255, 0.3);
    }
    .block-select {
      flex-grow: 1;
    }
    
    .table-editor-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-x: auto;
    }
    .table-row {
      display: flex;
      gap: 5px;
    }
    .table-cell {
      display: flex;
      min-width: 150px;
      flex-grow: 1;
    }
    
    .pros-cons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .comparison-card-editor {
      background: rgba(0,0,0,0.2);
      padding: 15px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .spec-row {
      display: flex;
    }
    .spec-input {
      flex: 1;
    }
  `]
})
export class BlockEditorComponent {
  @Input() blocks: ArticleBlock[] = [];
  @Output() blocksChange = new EventEmitter<ArticleBlock[]>();

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  notifyChange() {
    this.blocksChange.emit(this.blocks);
  }

  addBlock(typeStr: string) {
    const type = typeStr as BlockType;
    let newBlock: any = { type, id: this.generateId() };

    switch(type) {
      case 'heading': newBlock.data = { text: '', level: 2 }; break;
      case 'paragraph': newBlock.data = { text: '' }; break;
      case 'image': newBlock.data = { url: '', caption: '', alt: '' }; break;
      case 'table': newBlock.data = { withHeadings: true, content: [['', ''], ['', '']] }; break;
      case 'comparison': newBlock.data = { items: [{ title: '', specs: [{ label: '', value: '' }] }] }; break;
      case 'callout': newBlock.data = { text: '', style: 'info', icon: '💡' }; break;
      case 'faq': newBlock.data = { items: [{ question: '', answer: '' }] }; break;
      case 'pros-cons': newBlock.data = { pros: [''], cons: [''] }; break;
      case 'list': newBlock.data = { style: 'unordered', items: [''] }; break;
      case 'quote': newBlock.data = { text: '', author: '' }; break;
      case 'divider': newBlock.data = {}; break;
      case 'cta': newBlock.data = { text: '', buttonText: '', url: '', style: 'primary' }; break;
      case 'related': newBlock.data = { articleIds: [''] }; break;
      case 'statistics': newBlock.data = { items: [{ label: '', value: '', icon: '' }] }; break;
      case 'timeline': newBlock.data = { events: [{ date: '', title: '', description: '' }] }; break;
      case 'gallery': newBlock.data = { columns: 3, images: [{ url: '', caption: '', alt: '' }] }; break;
    }

    if (!this.blocks) {
      this.blocks = [];
    }
    this.blocks.push(newBlock);
    this.notifyChange();
  }

  removeBlock(index: number) {
    this.blocks.splice(index, 1);
    this.blocksChange.emit(this.blocks);
  }

  duplicateBlock(index: number) {
    const blockToClone = this.blocks[index];
    const clonedBlock = JSON.parse(JSON.stringify(blockToClone));
    this.blocks.splice(index + 1, 0, clonedBlock);
    this.blocksChange.emit(this.blocks);
  }

  drop(event: CdkDragDrop<ArticleBlock[]>) {
    moveItemInArray(this.blocks, event.previousIndex, event.currentIndex);
    this.blocksChange.emit(this.blocks);
  }

  moveBlockUp(index: number) {
    if (index > 0) {
      const temp = this.blocks[index];
      this.blocks[index] = this.blocks[index - 1];
      this.blocks[index - 1] = temp;
      this.notifyChange();
    }
  }

  moveBlockDown(index: number) {
    if (index < this.blocks.length - 1) {
      const temp = this.blocks[index];
      this.blocks[index] = this.blocks[index + 1];
      this.blocks[index + 1] = temp;
      this.notifyChange();
    }
  }

  addTableRow(block: any) {
    const colsCount = block.data.content[0]?.length || 1;
    block.data.content.push(Array(colsCount).fill(''));
    this.notifyChange();
  }
  removeTableRow(block: any, rowIndex: number) {
    block.data.content.splice(rowIndex, 1);
    this.notifyChange();
  }
  addTableColumn(block: any) {
    block.data.content.forEach((row: string[]) => row.push(''));
    this.notifyChange();
  }
  removeTableColumn(block: any) {
    block.data.content.forEach((row: string[]) => row.pop());
    this.notifyChange();
  }

  // --- Comparison Helpers ---
  addComparisonCard(block: any) {
    block.data.items.push({ title: '', specs: [{ label: '', value: '' }] });
    this.notifyChange();
  }
  removeComparisonCard(block: any, index: number) {
    block.data.items.splice(index, 1);
    this.notifyChange();
  }
  addComparisonSpec(card: any) {
    card.specs.push({ label: '', value: '' });
    this.notifyChange();
  }
  removeComparisonSpec(card: any, index: number) {
    card.specs.splice(index, 1);
    this.notifyChange();
  }

  // --- FAQ Helpers ---
  addFaqItem(block: any) {
    block.data.items.push({ question: '', answer: '' });
    this.notifyChange();
  }
  removeFaqItem(block: any, index: number) {
    block.data.items.splice(index, 1);
    this.notifyChange();
  }

  // --- Pros/Cons Helpers ---
  addPro(block: any) {
    block.data.pros.push('');
    this.notifyChange();
  }
  removePro(block: any, index: number) {
    block.data.pros.splice(index, 1);
    this.notifyChange();
  }
  addCon(block: any) {
    block.data.cons.push('');
    this.notifyChange();
  }
  removeCon(block: any, index: number) {
    block.data.cons.splice(index, 1);
    this.notifyChange();
  }

  // --- List Helpers ---
  addListItem(block: any) {
    block.data.items.push('');
    this.notifyChange();
  }
  removeListItem(block: any, index: number) {
    block.data.items.splice(index, 1);
    this.notifyChange();
  }

  // --- Related Content Helpers ---
  addRelatedItem(block: any) {
    block.data.articleIds.push('');
    this.notifyChange();
  }
  removeRelatedItem(block: any, index: number) {
    block.data.articleIds.splice(index, 1);
    this.notifyChange();
  }

  // --- Statistics Helpers ---
  addStatisticItem(block: any) {
    block.data.items.push({ label: '', value: '', icon: '' });
    this.notifyChange();
  }
  removeStatisticItem(block: any, index: number) {
    block.data.items.splice(index, 1);
    this.notifyChange();
  }

  // --- Timeline Helpers ---
  addTimelineEvent(block: any) {
    block.data.events.push({ date: '', title: '', description: '' });
    this.notifyChange();
  }
  removeTimelineEvent(block: any, index: number) {
    block.data.events.splice(index, 1);
    this.notifyChange();
  }

  // --- Gallery Helpers ---
  addGalleryImage(block: any) {
    block.data.images.push({ url: '', caption: '', alt: '' });
    this.notifyChange();
  }
  removeGalleryImage(block: any, index: number) {
    block.data.images.splice(index, 1);
    this.notifyChange();
  }

  // --- Image Upload Helpers ---
  processImageFile(file: File, callback: (base64Url: string) => void) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.80);
          callback(base64Data);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  onImageBlockUpload(event: Event, block: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    block._uploading = true;
    this.notifyChange(); // Trigger UI update for "Processing..."
    
    this.processImageFile(input.files[0], (base64Url) => {
      block.data.url = base64Url;
      block._uploading = false;
      this.notifyChange();
    });
    
    // Clear input so same file can be selected again if needed
    input.value = '';
  }

  onGalleryImageUpload(event: Event, img: any, block: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    img._uploading = true;
    this.notifyChange(); // Trigger UI update
    
    this.processImageFile(input.files[0], (base64Url) => {
      img.url = base64Url;
      img._uploading = false;
      this.notifyChange();
    });
    
    input.value = '';
  }
}
