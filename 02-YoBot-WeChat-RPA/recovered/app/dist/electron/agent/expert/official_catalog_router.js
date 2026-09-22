import { guardLocalExpertRequest } from "./local_api_guard.js";
export function registerOfficialExpertCatalogApi(app, service) {
    app.get("/api/official-experts/catalog", (req, res) => {
        if (!guardLocalExpertRequest(req, res))
            return;
        res.json(service.catalog());
    });
    console.log("[OfficialExperts] Read-only Worker catalog endpoint mounted");
}
