import { NextRequest, NextResponse } from "next/server";
import {
  getTrainingJobParticipants,
  getTrainingJobs,
} from "@/services/training-job.service";
import type { TrainingJobStatusDto } from "@/types";

const statuses: TrainingJobStatusDto[] = [
  "WAITING",
  "RUNNING",
  "STOPPED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

export async function GET(request: NextRequest) {
  const requestedStatus = request.nextUrl.searchParams.get("status");
  if (
    requestedStatus &&
    !statuses.some((status) => status === requestedStatus)
  ) {
    return NextResponse.json(
      { message: "Invalid training job status", statusCode: 400 },
      { status: 400 },
    );
  }

  const requestedPage = Number(request.nextUrl.searchParams.get("page"));
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit"));
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit >= 1
      ? Math.min(100, Math.floor(requestedLimit))
      : 10;
  const search = request.nextUrl.searchParams
    .get("search")
    ?.trim()
    .toLowerCase();

  try {
    const { data: allJobs } = await getTrainingJobs();
    const filteredJobs = allJobs.filter((job) => {
      const matchesStatus =
        job.status !== "DRAFT" &&
        (!requestedStatus || job.status === requestedStatus);
      const matchesSearch =
        !search ||
        [
          job.id,
          job.name,
          job.description,
          job.initialModelHash,
          job.finalModelHash,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });

    const jobs = filteredJobs.slice((page - 1) * limit, page * limit);
    const data = await Promise.all(
      jobs.map(async (job) => {
        const { data: participants } = await getTrainingJobParticipants(job.id);
        return {
          ...job,
          participantUserIds: participants.map(
            (participant) => participant.user.id,
          ),
        };
      }),
    );
    const total = filteredJobs.length;

    return NextResponse.json({
      data,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error instanceof Response ? error.status : 500;
    const message =
      error instanceof Response
        ? await error.text()
        : error instanceof Error
          ? error.message
          : "Unexpected error occurred";
    return NextResponse.json({ message, statusCode }, { status: statusCode });
  }
}
