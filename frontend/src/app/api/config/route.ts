import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        googleClientId:
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
            process.env.GOOGLE_CLIENT_ID ||
            "800933197735-9grufhka8flbpje3iqgaiudplbp2pqot.apps.googleusercontent.com",
    });
}