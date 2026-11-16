import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/services/user.service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );

    const res = await getUsers(searchParams);

    return NextResponse.json(res);
  } catch (error) {
    const statusCode =
      error instanceof Response
        ? error.status
        : error &&
            typeof error === "object" &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
    const message =
      error instanceof Response
        ? await error.text()
        : error instanceof Error
          ? error.message
          : "Unexpected error occurred";
    return NextResponse.json(
      {
        message,
        statusCode,
      },
      { status: statusCode },
    );
  }
}
