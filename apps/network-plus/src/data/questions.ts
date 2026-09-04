import { certConfig } from "../cert.config";
import { loadQuestions } from "./load-questions";

const knownDomainIds = new Set(certConfig.domains.map((d) => d.id));

export const { questions, errors: questionLoadErrors } = loadQuestions(knownDomainIds);
