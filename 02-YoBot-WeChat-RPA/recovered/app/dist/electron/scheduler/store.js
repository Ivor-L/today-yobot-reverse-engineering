import * as path from 'path';
import { readTaskStoreFile, writeTaskStoreFileAtomic } from './store_file.js';
const STORE_FILE = path.join(process.env.USER_DATA_PATH || process.cwd(), 'data', 'tasks.json');
export class TaskStore {
    data = { jobs: [] };
    loadError = null;
    constructor() {
        this.load();
    }
    load() {
        try {
            try {
                this.data = readTaskStoreFile(STORE_FILE, { recoverEmptyIfNoValidBackup: true });
                // 存量任务没有 revision；只在内存补齐，下一次真实写入时随快照持久化。
                this.data = {
                    revision: Number.isInteger(this.data.revision) ? this.data.revision : 0,
                    jobs: this.data.jobs.map(job => ({ ...job, revision: Number.isInteger(job.revision) ? job.revision : 1 })),
                };
            }
            catch (error) {
                if (error?.code === 'ENOENT') {
                    this.save();
                }
                else {
                    throw error;
                }
            }
        }
        catch (error) {
            console.error("[Scheduler] Failed to load tasks:", error);
            this.data = { jobs: [] };
            this.loadError = error instanceof Error ? error : new Error(String(error));
        }
    }
    assertWritable() {
        if (this.loadError) {
            throw new Error(`任务存储加载失败，为防止覆盖原数据，本次写入已拒绝：${this.loadError.message}`);
        }
    }
    save() {
        this.assertWritable();
        const next = { ...this.data, revision: (this.data.revision || 0) + 1 };
        writeTaskStoreFileAtomic(STORE_FILE, next);
        this.data = next;
    }
    getAll() {
        return this.data.jobs;
    }
    add(job) {
        this.assertWritable();
        const next = {
            revision: (this.data.revision || 0) + 1,
            jobs: [...this.data.jobs, job],
        };
        writeTaskStoreFileAtomic(STORE_FILE, next);
        this.data = next;
    }
    update(jobId, patch) {
        this.assertWritable();
        const index = this.data.jobs.findIndex(j => j.id === jobId);
        if (index < 0)
            return false;
        const jobs = [...this.data.jobs];
        jobs[index] = { ...jobs[index], ...patch };
        const next = { revision: (this.data.revision || 0) + 1, jobs };
        writeTaskStoreFileAtomic(STORE_FILE, next);
        this.data = next;
        return true;
    }
    remove(jobId) {
        this.assertWritable();
        const jobs = this.data.jobs.filter(j => j.id !== jobId);
        if (jobs.length === this.data.jobs.length)
            return false;
        const next = { revision: (this.data.revision || 0) + 1, jobs };
        writeTaskStoreFileAtomic(STORE_FILE, next);
        this.data = next;
        return true;
    }
    get(jobId) {
        return this.data.jobs.find(j => j.id === jobId);
    }
}
