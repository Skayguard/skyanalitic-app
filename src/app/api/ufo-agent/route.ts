
import {NextRequest, NextResponse} from 'next/server';
import {ufoAgent} from '@/ai/ufo-agent';

export async function POST(request: NextRequest) {
  const {userMessage} = await request.json();

  if (!userMessage) {
    return NextResponse.json({error: 'Missing userMessage'}, {status: 400});
  }

  try {
    const {agentResponse} = await ufoAgent({userMessage});
    return NextResponse.json({agentResponse});
  } catch (error) {
    console.error('Error invoking ufoAgent:', error);
    return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
  }
}
