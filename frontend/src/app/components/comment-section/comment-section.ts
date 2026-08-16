import {
  Component,
  Input,
  OnInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserAuthService, EndUser } from '../../services/user-auth.service';
import { getApiBaseUrl } from '../../core/http/api-base-url';
import { Observable } from 'rxjs';

declare var google: any;

export interface CommentUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface CommentItem {
  _id: string;
  userId: CommentUser;
  targetType: string;
  targetId: string;
  parentCommentId?: string | null;
  text: string;
  deleted: boolean;
  createdAt: string;
  editedAt?: string | null;
  replies?: CommentItem[];
}

export interface CommentResponse {
  success: boolean;
  data: CommentItem[];
  pagination: {
    page: number;
    limit: number;
    totalTopLevel: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="comment-section-container" id="comments">
      <div class="comment-section-header">
        <h3 class="section-title">
          <span class="title-icon">💬</span>
          <span>Discussion ({{ totalTopLevel }})</span>
        </h3>
      </div>

      <!-- Logged-In Post Box / Logged-Out Sign-In Prompt -->
      <ng-container *ngIf="(currentUser$ | async) as user; else loggedOutPromptTpl">
        <div class="comment-input-card">
          <div class="user-avatar-small">
            <img *ngIf="user.avatarUrl" [src]="user.avatarUrl" [alt]="user.name" class="avatar-img" />
            <div *ngIf="!user.avatarUrl" class="avatar-initial">{{ getInitial(user.name, user.email) }}</div>
          </div>
          <div class="input-form-wrapper">
            <textarea
              [(ngModel)]="newCommentText"
              placeholder="Share your thoughts or ask a question about this article..."
              rows="3"
              class="comment-textarea"
              [disabled]="submitting"
            ></textarea>
            <div class="input-actions">
              <span class="char-counter" [class.near-limit]="newCommentText.length > 1800">
                {{ newCommentText.length }}/2000
              </span>
              <button
                type="button"
                class="btn-submit-comment"
                (click)="postTopLevelComment()"
                [disabled]="submitting || !newCommentText.trim()"
              >
                {{ submitting ? 'Posting...' : 'Post Comment' }}
              </button>
            </div>
            <div *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</div>
          </div>
        </div>
      </ng-container>

      <ng-template #loggedOutPromptTpl>
        <div class="signin-prompt-card">
          <div class="prompt-content">
            <span class="prompt-icon">🔒</span>
            <div class="prompt-text">
              <span class="prompt-heading">Join the conversation</span>
              <span class="prompt-subheading">Sign in with your Google account to post comments and reply to readers.</span>
            </div>
            <button type="button" class="btn-signin-prompt" (click)="triggerGoogleSignIn()">
              <svg class="g-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign in to comment</span>
            </button>
          </div>
        </div>
      </ng-template>

      <!-- Comments List -->
      <div class="comments-list" *ngIf="comments.length > 0; else emptyStateTpl">
        <div *ngFor="let comment of comments" class="comment-thread-card">
          <!-- Top-Level Comment Item -->
          <div class="comment-item" [class.deleted-item]="comment.deleted">
            <div class="comment-avatar">
              <img *ngIf="getAvatarUrl(comment.userId) && !comment.deleted" [src]="getAvatarUrl(comment.userId)" [alt]="getUserName(comment.userId)" />
              <div *ngIf="!getAvatarUrl(comment.userId) || comment.deleted" class="avatar-initial">
                {{ comment.deleted ? '?' : getInitial(getUserName(comment.userId), getUserEmail(comment.userId)) }}
              </div>
            </div>

            <div class="comment-body">
              <div class="comment-header">
                <span class="author-name">{{ comment.deleted ? '[deleted]' : getUserName(comment.userId) }}</span>
                <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                <span *ngIf="comment.editedAt && !comment.deleted" class="edited-badge">(edited)</span>
              </div>

              <!-- Edit Form vs Display Text -->
              <div *ngIf="editingCommentId === comment._id; else textDisplayTpl" class="inline-edit-box">
                <textarea [(ngModel)]="editText" rows="2" class="edit-textarea"></textarea>
                <div class="edit-actions">
                  <button type="button" class="btn-cancel" (click)="cancelEdit()">Cancel</button>
                  <button type="button" class="btn-save" (click)="saveEdit(comment._id)">Save Edit</button>
                </div>
              </div>

              <ng-template #textDisplayTpl>
                <p class="comment-text" [class.deleted-text]="comment.deleted">{{ comment.text }}</p>
              </ng-template>

              <!-- Actions: Reply, Edit, Delete -->
              <div class="comment-footer" *ngIf="!comment.deleted">
                <button type="button" class="btn-action-reply" (click)="onReplyClick(comment._id)">
                  ↩ Reply
                </button>

                <!-- Show Edit/Delete only for owner -->
                <ng-container *ngIf="(currentUser$ | async) as currentUser">
                  <ng-container *ngIf="isOwner(comment.userId, currentUser)">
                    <button type="button" class="btn-action-edit" (click)="startEdit(comment)">
                      ✎ Edit
                    </button>
                    <button type="button" class="btn-action-delete" (click)="deleteComment(comment._id)">
                      🗑 Delete
                    </button>
                  </ng-container>
                </ng-container>
              </div>

              <!-- Inline Reply Box -->
              <div *ngIf="replyingToId === comment._id" class="inline-reply-box">
                <ng-container *ngIf="(currentUser$ | async); else replySigninPrompt">
                  <textarea
                    [(ngModel)]="replyText"
                    placeholder="Write a reply..."
                    rows="2"
                    class="reply-textarea"
                  ></textarea>
                  <div class="reply-actions">
                    <button type="button" class="btn-cancel" (click)="cancelReply()">Cancel</button>
                    <button type="button" class="btn-submit-reply" (click)="postReply(comment._id)" [disabled]="!replyText.trim()">
                      Post Reply
                    </button>
                  </div>
                </ng-container>
                <ng-template #replySigninPrompt>
                  <div class="inline-signin-needed">
                    <span>Please sign in to reply to this comment.</span>
                    <button type="button" class="btn-inline-signin" (click)="triggerGoogleSignIn()">Sign in</button>
                  </div>
                </ng-template>
              </div>
            </div>
          </div>

          <!-- Nested Replies (1 Level Flat Threading) -->
          <div *ngIf="comment.replies && comment.replies.length > 0" class="replies-container">
            <div *ngFor="let reply of comment.replies" class="comment-item reply-item" [class.deleted-item]="reply.deleted">
              <div class="comment-avatar reply-avatar">
                <img *ngIf="getAvatarUrl(reply.userId) && !reply.deleted" [src]="getAvatarUrl(reply.userId)" [alt]="getUserName(reply.userId)" />
                <div *ngIf="!getAvatarUrl(reply.userId) || reply.deleted" class="avatar-initial">
                  {{ reply.deleted ? '?' : getInitial(getUserName(reply.userId), getUserEmail(reply.userId)) }}
                </div>
              </div>

              <div class="comment-body">
                <div class="comment-header">
                  <span class="author-name">{{ reply.deleted ? '[deleted]' : getUserName(reply.userId) }}</span>
                  <span class="comment-date">{{ formatDate(reply.createdAt) }}</span>
                  <span *ngIf="reply.editedAt && !reply.deleted" class="edited-badge">(edited)</span>
                </div>

                <!-- Edit Form vs Display Text for Reply -->
                <div *ngIf="editingCommentId === reply._id; else replyTextDisplayTpl" class="inline-edit-box">
                  <textarea [(ngModel)]="editText" rows="2" class="edit-textarea"></textarea>
                  <div class="edit-actions">
                    <button type="button" class="btn-cancel" (click)="cancelEdit()">Cancel</button>
                    <button type="button" class="btn-save" (click)="saveEdit(reply._id)">Save Edit</button>
                  </div>
                </div>

                <ng-template #replyTextDisplayTpl>
                  <p class="comment-text" [class.deleted-text]="reply.deleted">{{ reply.text }}</p>
                </ng-template>

                <!-- Actions for Reply -->
                <div class="comment-footer" *ngIf="!reply.deleted">
                  <ng-container *ngIf="(currentUser$ | async) as currentUser">
                    <ng-container *ngIf="isOwner(reply.userId, currentUser)">
                      <button type="button" class="btn-action-edit" (click)="startEdit(reply)">
                        ✎ Edit
                      </button>
                      <button type="button" class="btn-action-delete" (click)="deleteComment(reply._id)">
                        🗑 Delete
                      </button>
                    </ng-container>
                  </ng-container>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template #emptyStateTpl>
        <div class="empty-comments-state">
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      </ng-template>

      <!-- Load More Pagination Button -->
      <div *ngIf="hasNextPage" class="load-more-wrapper">
        <button type="button" class="btn-load-more" (click)="loadMoreComments()" [disabled]="loadingMore">
          {{ loadingMore ? 'Loading comments...' : 'Load more comments' }}
        </button>
      </div>
    </section>
  `,
  styles: [`
    .comment-section-container {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .comment-section-header {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #1A202C;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Logged In Post Card */
    .comment-input-card {
      display: flex;
      gap: 14px;
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
      margin-bottom: 2rem;
    }

    .user-avatar-small {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      flex-shrink: 0;
      overflow: hidden;
    }

    .user-avatar-small img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .input-form-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .comment-textarea {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 12px;
      font-size: 0.95rem;
      color: #2D3748;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }

    .comment-textarea:focus {
      border-color: #0088CC;
      box-shadow: 0 0 0 3px rgba(0, 136, 204, 0.15);
    }

    .input-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .char-counter {
      font-size: 0.78rem;
      color: #A0AEC0;
    }

    .char-counter.near-limit {
      color: #E53E3E;
    }

    .btn-submit-comment {
      background: #0088CC;
      color: #FFFFFF;
      border: none;
      padding: 8px 18px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-submit-comment:hover:not(:disabled) {
      background: #006699;
      transform: translateY(-1px);
    }

    .btn-submit-comment:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Logged Out Sign In Card */
    .signin-prompt-card {
      background: linear-gradient(135deg, rgba(0, 136, 204, 0.04) 0%, rgba(121, 82, 255, 0.04) 100%);
      border: 1px dashed rgba(0, 136, 204, 0.3);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 2rem;
    }

    .prompt-content {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .prompt-icon {
      font-size: 1.6rem;
    }

    .prompt-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .prompt-heading {
      font-weight: 700;
      color: #1A202C;
      font-size: 1rem;
    }

    .prompt-subheading {
      font-size: 0.84rem;
      color: #718096;
    }

    .btn-signin-prompt {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #FFFFFF;
      color: #2D3748;
      border: 1px solid rgba(0, 0, 0, 0.15);
      padding: 8px 16px;
      border-radius: 30px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .btn-signin-prompt:hover {
      background: #F7FAFC;
      border-color: #0088CC;
      color: #0088CC;
    }

    .g-icon {
      width: 18px;
      height: 18px;
    }

    /* Comments List */
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .comment-thread-card {
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    }

    .comment-item {
      display: flex;
      gap: 12px;
    }

    .comment-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      flex-shrink: 0;
      overflow: hidden;
    }

    .comment-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-initial {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, #0088CC 0%, #005580 100%);
      color: #FFFFFF;
      font-size: 0.88rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .comment-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .comment-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .author-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: #1A202C;
    }

    .comment-date {
      font-size: 0.76rem;
      color: #A0AEC0;
    }

    .edited-badge {
      font-size: 0.72rem;
      color: #718096;
      font-style: italic;
    }

    .comment-text {
      font-size: 0.92rem;
      color: #2D3748;
      line-height: 1.5;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .deleted-text {
      color: #A0AEC0;
      font-style: italic;
    }

    .comment-footer {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 4px;
    }

    .btn-action-reply,
    .btn-action-edit,
    .btn-action-delete {
      background: none;
      border: none;
      padding: 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: #718096;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .btn-action-reply:hover { color: #0088CC; }
    .btn-action-edit:hover { color: #2B6CB0; }
    .btn-action-delete:hover { color: #E53E3E; }

    /* Nested Replies Container */
    .replies-container {
      margin-top: 12px;
      margin-left: 20px;
      padding-left: 14px;
      border-left: 2px solid rgba(0, 136, 204, 0.15);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reply-item {
      gap: 10px;
    }

    .reply-avatar {
      width: 28px;
      height: 28px;
    }

    /* Inline Edit & Reply Boxes */
    .inline-edit-box,
    .inline-reply-box {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .edit-textarea,
    .reply-textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid rgba(0, 136, 204, 0.4);
      border-radius: 10px;
      font-size: 0.9rem;
      outline: none;
      box-sizing: border-box;
    }

    .edit-actions,
    .reply-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.15);
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #4A5568;
      cursor: pointer;
    }

    .btn-save,
    .btn-submit-reply {
      background: #0088CC;
      color: #FFFFFF;
      border: none;
      padding: 4px 14px;
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    .inline-signin-needed {
      font-size: 0.84rem;
      color: #718096;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      background: rgba(0, 136, 204, 0.05);
      border-radius: 8px;
    }

    .btn-inline-signin {
      background: #0088CC;
      color: #FFFFFF;
      border: none;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }

    .empty-comments-state {
      text-align: center;
      padding: 2rem;
      color: #A0AEC0;
      font-size: 0.95rem;
    }

    .load-more-wrapper {
      margin-top: 1.5rem;
      text-align: center;
    }

    .btn-load-more {
      background: #FFFFFF;
      border: 1px solid rgba(0, 136, 204, 0.3);
      color: #0088CC;
      padding: 10px 24px;
      border-radius: 30px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-load-more:hover:not(:disabled) {
      background: rgba(0, 136, 204, 0.05);
      border-color: #0088CC;
    }

    .error-banner {
      color: #E53E3E;
      font-size: 0.82rem;
      margin-top: 4px;
    }
  `]
})
export class CommentSectionComponent implements OnInit {
  @Input() targetType: 'article' | 'vehicle' = 'article';
  @Input() targetId: string = '';

  currentUser$: Observable<EndUser | null>;
  comments: CommentItem[] = [];

  newCommentText = '';
  replyingToId: string | null = null;
  replyText = '';
  editingCommentId: string | null = null;
  editText = '';

  page = 1;
  limit = 10;
  totalTopLevel = 0;
  hasNextPage = false;
  submitting = false;
  loadingMore = false;
  errorMessage = '';

  private apiUrl = getApiBaseUrl();

  constructor(
    private http: HttpClient,
    public userAuthService: UserAuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser$ = this.userAuthService.currentUser$;
  }

  ngOnInit(): void {
    if (this.targetId) {
      this.fetchComments(1);
    }
  }

  fetchComments(page: number): void {
    if (!this.targetId) return;

    this.http.get<CommentResponse>(
      `${this.apiUrl}/comments?targetType=${this.targetType}&targetId=${this.targetId}&page=${page}&limit=${this.limit}`
    ).subscribe({
      next: (res) => {
        if (res && res.success) {
          if (page === 1) {
            this.comments = res.data;
          } else {
            this.comments = [...this.comments, ...res.data];
          }
          this.page = res.pagination.page;
          this.totalTopLevel = res.pagination.totalTopLevel;
          this.hasNextPage = res.pagination.hasNextPage;
        }
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching comments:', err);
        this.loadingMore = false;
      }
    });
  }

  loadMoreComments(): void {
    if (!this.hasNextPage || this.loadingMore) return;
    this.loadingMore = true;
    this.fetchComments(this.page + 1);
  }

  postTopLevelComment(): void {
    if (!this.newCommentText.trim() || this.submitting) return;

    const token = this.userAuthService.token;
    if (!token) {
      this.triggerGoogleSignIn();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.post<{ success: boolean; data: CommentItem }>(
      `${this.apiUrl}/comments`,
      {
        targetType: this.targetType,
        targetId: this.targetId,
        text: this.newCommentText.trim()
      },
      { headers }
    ).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.comments.unshift({
            ...res.data,
            replies: []
          });
          this.totalTopLevel++;
          this.newCommentText = '';
        }
        this.submitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.error?.message || 'Failed to post comment. Please try again.';
        this.errorMessage = msg;
        this.cdr.detectChanges();
      }
    });
  }

  onReplyClick(commentId: string): void {
    const token = this.userAuthService.token;
    if (!token) {
      this.triggerGoogleSignIn();
      return;
    }
    this.replyingToId = this.replyingToId === commentId ? null : commentId;
    this.replyText = '';
  }

  cancelReply(): void {
    this.replyingToId = null;
    this.replyText = '';
  }

  postReply(parentCommentId: string): void {
    if (!this.replyText.trim()) return;

    const token = this.userAuthService.token;
    if (!token) {
      this.triggerGoogleSignIn();
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.post<{ success: boolean; data: CommentItem }>(
      `${this.apiUrl}/comments`,
      {
        targetType: this.targetType,
        targetId: this.targetId,
        parentCommentId,
        text: this.replyText.trim()
      },
      { headers }
    ).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const parent = this.comments.find((c) => c._id === parentCommentId);
          if (parent) {
            if (!parent.replies) parent.replies = [];
            parent.replies.push(res.data);
          }
          this.replyingToId = null;
          this.replyText = '';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.error?.message || 'Failed to post reply.';
        alert(msg);
      }
    });
  }

  startEdit(comment: CommentItem): void {
    this.editingCommentId = comment._id;
    this.editText = comment.text;
  }

  cancelEdit(): void {
    this.editingCommentId = null;
    this.editText = '';
  }

  saveEdit(commentId: string): void {
    if (!this.editText.trim()) return;

    const token = this.userAuthService.token;
    if (!token) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.patch<{ success: boolean; data: CommentItem }>(
      `${this.apiUrl}/comments/${commentId}`,
      { text: this.editText.trim() },
      { headers }
    ).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.updateCommentInState(res.data);
          this.editingCommentId = null;
          this.editText = '';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.error?.message || 'Failed to edit comment.';
        alert(msg);
      }
    });
  }

  deleteComment(commentId: string): void {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const token = this.userAuthService.token;
    if (!token) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.delete<{ success: boolean; data: { _id: string; deleted: boolean; text: string } }>(
      `${this.apiUrl}/comments/${commentId}`,
      { headers }
    ).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.markCommentDeletedInState(commentId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.error?.message || 'Failed to delete comment.';
        alert(msg);
      }
    });
  }

  triggerGoogleSignIn(): void {
    if (isPlatformBrowser(this.platformId) && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.prompt();
    }
  }

  getAvatarUrl(user?: CommentUser): string {
    return user?.avatarUrl || '';
  }

  getUserEmail(user?: CommentUser): string {
    return user?.email || '';
  }

  getUserName(user?: CommentUser): string {
    if (!user) return 'EVCorn Reader';
    return user.name || user.email?.split('@')[0] || 'EVCorn Reader';
  }

  getInitial(name?: string, email?: string): string {
    if (name && name.trim().length > 0) {
      return name.trim().charAt(0).toUpperCase();
    }
    if (email && email.trim().length > 0) {
      return email.trim().charAt(0).toUpperCase();
    }
    return 'C';
  }

  isOwner(user?: CommentUser, currentUser?: EndUser | null): boolean {
    if (!user || !currentUser) return false;
    const userIdStr = user._id || user.id;
    return userIdStr === currentUser.id;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }

  private updateCommentInState(updated: CommentItem): void {
    for (const c of this.comments) {
      if (c._id === updated._id) {
        c.text = updated.text;
        c.editedAt = updated.editedAt;
        return;
      }
      if (c.replies) {
        for (const r of c.replies) {
          if (r._id === updated._id) {
            r.text = updated.text;
            r.editedAt = updated.editedAt;
            return;
          }
        }
      }
    }
  }

  private markCommentDeletedInState(commentId: string): void {
    for (const c of this.comments) {
      if (c._id === commentId) {
        c.deleted = true;
        c.text = '[Comment deleted]';
        return;
      }
      if (c.replies) {
        for (const r of c.replies) {
          if (r._id === commentId) {
            r.deleted = true;
            r.text = '[Comment deleted]';
            return;
          }
        }
      }
    }
  }
}
