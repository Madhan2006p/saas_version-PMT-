const configUrl = '/api/v1/workflow/states/content-type-id/?app_label=projects&model=project';
const url = new URL(`http://localhost${configUrl}`);
console.log("appLabel:", url.searchParams.get("app_label"));
console.log("model:", url.searchParams.get("model"));
