// Ensures a single job per logical ID while allowing replacements for
// completed/failed jobs. Active/waiting/delayed jobs are skipped to avoid
// concurrent duplicates. Adapted from cossistant/packages/jobs — fully
// generic, no changes needed.

import type { Job, JobsOptions, Queue } from "bullmq";

type SimpleJob<T> = Job<T, unknown, string>;

export type UniqueJobResult<T> =
	| { status: "created"; job: SimpleJob<T> }
	| { status: "replaced"; job: SimpleJob<T>; previousState: "completed" | "failed" }
	| {
			status: "skipped";
			reason: "active" | "debouncing" | "unexpected";
			existingState: string;
			existingJob: SimpleJob<T>;
			existingJobData: T;
	  };

export type AddUniqueJobParams<T> = {
	queue: Queue<T>;
	jobId: string;
	jobName: string;
	data: T;
	options: Omit<JobsOptions, "jobId">;
	logPrefix: string;
};

export async function addUniqueJob<T>(params: AddUniqueJobParams<T>): Promise<UniqueJobResult<T>> {
	const { queue, jobId, jobName, data, options, logPrefix } = params;
	const existingJob = await queue.getJob(jobId);

	if (existingJob) {
		const existingState = await existingJob.getState();

		if (existingState === "completed" || existingState === "failed") {
			await existingJob.remove();
			console.log(`${logPrefix} Removed ${existingState} job ${jobId}`);
			const job = (await (queue as Queue).add(jobName, data, { ...options, jobId })) as SimpleJob<T>;
			return { status: "replaced", job, previousState: existingState };
		}

		if (existingState === "delayed" || existingState === "waiting" || existingState === "active") {
			console.log(`${logPrefix} Job ${jobId} already ${existingState}, skipping`);
			return {
				status: "skipped",
				reason: existingState === "active" ? "active" : "debouncing",
				existingState,
				existingJob: existingJob as SimpleJob<T>,
				existingJobData: existingJob.data as T,
			};
		}

		console.warn(`${logPrefix} Job ${jobId} in unexpected state: ${existingState}, skipping`);
		return {
			status: "skipped",
			reason: "unexpected",
			existingState,
			existingJob: existingJob as SimpleJob<T>,
			existingJobData: existingJob.data as T,
		};
	}

	const job = (await (queue as Queue).add(jobName, data, { ...options, jobId })) as SimpleJob<T>;
	return { status: "created", job };
}
