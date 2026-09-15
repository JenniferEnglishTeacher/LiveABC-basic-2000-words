# Activate pronunciation scoring for Units 1–3

The sentence practice is implemented, but real scores require a deployed Azure service.
No Azure account, paid resource, or credentials have been created by this change.

## Teacher setup
1. Create an Azure Speech resource and a Node.js 22 Azure Function App. Use the Speech resource's custom endpoint (https://YOUR-RESOURCE.cognitiveservices.azure.com). If it has no custom endpoint yet, configure one in Azure.
2. In the Function App environment settings, set:
   - AZURE_SPEECH_KEY: the Speech resource key (server only).
   - AZURE_SPEECH_ENDPOINT: the custom HTTPS Speech resource endpoint.
   - CLASS_ACCESS_CODE: a private code you share with your class.
   - ALLOWED_ORIGIN: https://jenniferenglishteacher.github.io
   - FUNCTIONS_WORKER_RUNTIME: node
   - AzureWebJobsStorage: the Function App's required storage connection.
3. From azure-speech, run npm install and deploy with Azure Functions Core Tools: func azure functionapp publish YOUR-FUNCTION-APP.
4. Configure Azure Function App CORS to allow only https://jenniferenglishteacher.github.io (no wildcard). The handler also checks the origin. CORS is not authentication; the private class code controls access.
5. Put the public https://YOUR-FUNCTION-APP.azurewebsites.net/api/pronunciation URL into speech-config.js, then publish that file to GitHub Pages. Do not add Azure keys or the class code to any website file or commit.
6. Share the class code privately with students. Set Azure spending alerts and resource quotas appropriate for your class. Rotate the class code if it is shared outside the class. For a wider public launch, put account authentication and a rate-limited gateway in front of the function.
7. Test with a real microphone: a complete clear sentence, a poorly pronounced sentence, a partial sentence, silence, wrong class code, and microphone permission denial. Confirm that the next sentence unlocks only at accuracy >=80 and completeness >=80.

## Student experience
- Part 4 in each existing unit contains the original ten vocabulary sample sentences.
- One sentence is active at a time. Students may listen, record up to 28 seconds, replay, retry, and move forward after passing.
- Audio is uploaded only on Stop & score and sent to Azure for assessment; this application does not store audio on the server or log request bodies.
- Only passing scores and a sentence fingerprint are saved in localStorage. Progress is specific to this browser, not a teacher gradebook; students with developer tools can change local storage.
- Browser transcript matching is not used as a substitute score. Offline, missing configuration, and service failures leave the next sentence locked.
- Existing quiz Reset affects the written quiz; the separate speaking restart clears that unit's speaking progress after confirmation.

## Implementation and validation
The browser uses an AudioWorklet to capture mono PCM, then encodes 16 kHz, 16-bit WAV.
The server validates the format, length, class code, origin, and sentence index before calling Azure.
Reference sentences live on the server; the client cannot supply arbitrary assessment text.
The Azure request enables miscue detection and uses HundredMark scores.
Both raw scores must be >=80; the UI floors displayed percentages so 79.99 never appears as a passing 80.

Run: node --test azure-speech/test/*.test.js
Run: node scripts/validate-speaking.cjs
For a local preview, run start-preview.cmd and open http://127.0.0.1:8765.
The live Azure scoring smoke test must be completed after credentials and hosting are connected.

References:
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short
- https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
