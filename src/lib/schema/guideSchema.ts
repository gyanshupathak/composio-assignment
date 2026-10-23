import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0" as const;

export const GuideOriginSchema = z.enum(["curated", "generated"]);

export const IntendedAudienceSchema = z.enum([
  "single_workspace_internal",
  "multi_workspace_external",
  "personal_or_prototype",
  "unknown",
]);

export const ProviderSupportStatusSchema = z.enum([
  "oauth_confirmed",
  "alternative_auth_documented",
  "no_public_oauth_established",
  "unknown_incomplete_research",
  "clarification_needed",
]);

export const ComposioManagedAuthStatusSchema = z.enum([
  "available",
  "unavailable",
  "not_applicable",
  "unknown",
]);

export const RecommendedPathSchema = z.enum([
  "use_composio_managed_oauth",
  "register_custom_oauth_app",
  "use_alternative_auth_method",
  "clarify_use_case",
  "gather_more_evidence",
  "contact_provider",
  "no_reliable_path_established",
]);

export const CustomOAuthRequiredSchema = z.enum([
  "no",
  "yes_for_production",
  "yes_always",
  "not_applicable",
  "unknown",
]);

export const DifficultyCategorySchema = z.enum([
  "straightforward",
  "moderate",
  "complex_approval_gated",
  "inconclusive",
]);

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

export const ResponsiblePartySchema = z.enum([
  "developer",
  "organization_admin",
  "end_user",
  "provider_review_team",
  "agent_assisted",
]);

export const CauseConfidenceSchema = z.enum([
  "documented",
  "maintainer_confirmed",
  "corroborated",
  "hypothesis",
]);

export const ProblemClassificationSchema = z.enum([
  "officially_documented_prerequisite",
  "developer_console_configuration",
  "authorization_flow_misunderstanding",
  "permission_scope_decision",
  "provider_policy_approval_gate",
  "sdk_framework_implementation",
  "composio_specific_configuration",
  "version_specific_bug",
  "account_specific_restriction",
  "documentation_ambiguity",
  "outdated_source",
  "community_workaround_trap",
  "unresolved_hypothesis",
]);

export const SeverityCategorySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const SourceTypeSchema = z.enum([
  "official_docs",
  "composio_docs",
  "github_issue",
  "github_repo",
  "stack_overflow",
  "developer_forum",
  "reddit",
  "support_kb",
  "third_party_docs",
]);

export const RetrievalStatusSchema = z.enum([
  "retrieved_200",
  "search_indexed_verified",
  "http_error",
  "unreachable",
  "blocked_ssrf",
]);

export const EvidenceStrengthSchema = z.enum(["A", "B", "C", "D", "E"]);

export const GuideStatusSchema = z.enum([
  "complete_verified",
  "partial_evidence",
  "inconclusive",
  "ambiguous_clarification_needed",
  "no_public_oauth_found",
]);

export const ResearchStopReasonSchema = z.enum([
  "sufficient_evidence",
  "ambiguous_input",
  "budget_limit_reached",
  "missing_runtime_credentials",
  "unsafe_url_rejected",
  "provider_unreachable",
]);

export const AlternativeScenarioMatrixItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  recommendedPath: RecommendedPathSchema,
  recommendedPathTitle: z.string().min(1),
  customOAuthAppRequired: CustomOAuthRequiredSchema,
  recommendedScopesOrCapabilities: z.array(z.string()),
  activeSetupEstimate: z.string().min(1),
  externalApprovalWait: z.string().min(1),
  keyRiskOrBlocker: z.string().min(1),
  rationale: z.string().min(1),
  evidenceIds: z.array(z.string()).min(1),
});

export const ScenarioSchema = z.object({
  integrationGoal: z.string().min(1),
  intendedAudience: IntendedAudienceSchema,
  requiredCapabilities: z.array(z.string()),
  optionalFeatures: z.array(
    z.object({
      feature: z.string().min(1),
      additionalPermissionsRequired: z.string().min(1),
      impactOnVerification: z.string().min(1),
    })
  ),
  accountWorkspaceAssumptions: z.array(z.string()),
  alternativeScenarios: z.array(AlternativeScenarioMatrixItemSchema).optional(),
});

export const PathComparisonItemSchema = z.object({
  pathType: z.enum([
    "composio_managed_oauth",
    "custom_oauth_app",
    "alternative_documented_auth",
    "unsupported_or_unknown",
  ]),
  title: z.string().min(1),
  applicability: z.enum([
    "recommended_now",
    "recommended_for_production",
    "conditional_alternative",
    "not_recommended",
    "not_available",
  ]),
  summary: z.string().min(1),
  whenToChoose: z.array(z.string()),
  tradeOffs: z.array(z.string()),
  requiredScopesOrCapabilities: z.array(z.string()),
  evidenceIds: z.array(z.string()).min(1),
});

export const AuthenticationAssessmentSchema = z.object({
  providerSupport: ProviderSupportStatusSchema,
  composioManagedAuth: z.object({
    status: ComposioManagedAuthStatusSchema,
    toolkitExamined: z.string().min(1),
    authMethodExamined: z.string().min(1),
    evidenceIds: z.array(z.string()),
    conditionsAndQualifications: z.array(z.string()),
  }),
  recommendedPath: RecommendedPathSchema,
  verdictHeadline: z.string().min(1),
  customOAuthAppRequired: CustomOAuthRequiredSchema,
  reasoning: z.string().min(1),
  launchBlockerSummary: z.string().min(1),
  pathComparison: z.array(PathComparisonItemSchema).min(1),
  evidenceIds: z.array(z.string()).min(1),
});

export const DifficultyAndEffortSchema = z.object({
  difficultyCategory: DifficultyCategorySchema,
  difficultyReasoning: z.string().min(1),
  activeSetupTimeRange: z.string().min(1),
  assumptions: z.array(z.string()).min(1),
  confidence: ConfidenceLevelSchema,
  preparationWork: z.array(z.string()),
  externalDependencies: z.array(
    z.object({
      dependency: z.string().min(1),
      party: z.string().min(1),
      requiredWhen: z.string().min(1),
      blockingImpact: z.string().min(1),
    })
  ),
  publishedApprovalTimeEstimate: z.string().nullable(),
  corroboratedRealWorldWaitNotes: z.string().nullable().optional(),
  unknownTimingNotes: z.array(z.string()),
  conditionsChangingEstimate: z.array(z.string()),
});

export const PrerequisiteItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    "account",
    "workspace_project",
    "domain_website",
    "callback_redirect",
    "capabilities_scopes",
    "policy_compliance",
  ]),
  title: z.string().min(1),
  detail: z.string().min(1),
  requiredWhen: z.string().min(1),
  evidenceIds: z.array(z.string()).min(1),
});

export const SetupStepSchema = z.object({
  id: z.string().min(1),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  instructions: z.string().min(1),
  whereToDoIt: z.string().min(1),
  consoleOrDocUrl: z.string().url().optional(),
  whyItMatters: z.string().min(1),
  prerequisites: z.array(z.string()),
  expectedOutcome: z.string().min(1),
  completionCheck: z.string().min(1),
  commonFailureCases: z.array(z.string()).min(1),
  estimatedTime: z.string().min(1),
  responsibleParty: ResponsiblePartySchema,
  evidenceIds: z.array(z.string()).min(1),
});

export const PainPointSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  symptom: z.string().min(1),
  scenario: z.string().min(1),
  likelyCause: z.string().min(1),
  causeConfidence: CauseConfidenceSchema,
  problemClassification: ProblemClassificationSchema,
  severity: SeverityCategorySchema,
  evidenceIds: z.array(z.string()).min(1),
  independentReportCount: z.number().int().positive().optional(),
  recencyVersionNotes: z.string().min(1),
  prevention: z.string().min(1),
  resolution: z.string().min(1),
  impactOnGuide: z.string().min(1),
});

export const LaunchChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  verificationMethod: z.string().min(1),
  failureIndicator: z.string().min(1),
  category: z.enum([
    "callback_redirect",
    "consent_scopes",
    "token_lifecycle",
    "api_verification",
    "security_credentials",
    "distribution_approval",
  ]),
});

export const EvidenceSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  canonicalUrl: z.string().url(),
  publisherDomain: z.string().min(1),
  sourceType: SourceTypeSchema,
  retrievalStatus: RetrievalStatusSchema,
  retrievedAt: z.string().min(1),
  publishedOrUpdatedAt: z.string().optional(),
  claimsSupported: z.array(z.string()),
  painPointsSupported: z.array(z.string()),
  summaryOfContent: z.string().min(1),
  evidenceStrength: EvidenceStrengthSchema,
  isIndependentReport: z.boolean(),
  limitations: z.string().min(1),
});

export const AgentResearchTraceSchema = z.object({
  searchesExecuted: z.number().int().nonnegative(),
  normalizedQueries: z.array(z.string()),
  sourcesRetrievedCount: z.number().int().nonnegative(),
  sourcesFailedCount: z.number().int().nonnegative(),
  documentsInspected: z.array(z.string()),
  painPointAreasExplored: z.array(z.string()),
  validationPerformed: z.array(z.string()),
  agentPreparedActions: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  stopReason: ResearchStopReasonSchema,
});

export const OutcomeAndNextActionSchema = z.object({
  guideStatus: GuideStatusSchema,
  confidence: ConfidenceLevelSchema,
  limitations: z.array(z.string()),
  recommendedNextStep: z.object({
    title: z.string().min(1),
    action: z.string().min(1),
    targetUrl: z.string().url().optional(),
    rationale: z.string().min(1),
  }),
  humanOnlyActions: z.array(z.string()).min(1),
  missingInformationToProceed: z.array(z.string()),
  outdatedReportMechanism: z.object({
    instructions: z.string().min(1),
    endpoint: z.string().min(1),
  }),
});

export const GuideSchema = z
  .object({
    id: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
    applicationName: z.string().min(1),
    aliases: z.array(z.string()),
    category: z.string().min(1),
    canonicalWebsite: z.string().url(),
    developerDocsUrl: z.string().url().nullable(),
    shortSummary: z.string().min(10),
    guideOrigin: GuideOriginSchema,
    createdAt: z.string().min(1),
    lastReviewedAt: z.string().min(1),
    schemaVersion: z.literal(SCHEMA_VERSION),
    scenario: ScenarioSchema,
    authenticationAssessment: AuthenticationAssessmentSchema,
    difficultyAndEffort: DifficultyAndEffortSchema,
    prerequisites: z.array(PrerequisiteItemSchema),
    setupSteps: z.array(SetupStepSchema),
    painPoints: z.array(PainPointSchema),
    launchChecklist: z.array(LaunchChecklistItemSchema),
    evidence: z.array(EvidenceSourceSchema).min(1),
    agentResearchTrace: AgentResearchTraceSchema,
    outcome: OutcomeAndNextActionSchema,
  })
  .superRefine((guide, ctx) => {
    // 1. Ensure all evidence IDs are unique
    const seenEvidenceIds = new Set<string>();
    for (const ev of guide.evidence) {
      if (seenEvidenceIds.has(ev.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidence"],
          message: `Duplicate evidence ID found: ${ev.id}`,
        });
      }
      seenEvidenceIds.add(ev.id);
    }

    // 2. Ensure every referenced evidence ID in assessment, prerequisites, steps, and pain points exists in guide.evidence
    const checkRefs = (ids: string[], path: (string | number)[]) => {
      for (const refId of ids) {
        if (!seenEvidenceIds.has(refId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: `Referenced evidence ID "${refId}" does not exist in guide.evidence`,
          });
        }
      }
    };

    checkRefs(guide.authenticationAssessment.evidenceIds, [
      "authenticationAssessment",
      "evidenceIds",
    ]);
    checkRefs(
      guide.authenticationAssessment.composioManagedAuth.evidenceIds,
      ["authenticationAssessment", "composioManagedAuth", "evidenceIds"]
    );
    guide.authenticationAssessment.pathComparison.forEach((p, idx) =>
      checkRefs(p.evidenceIds, [
        "authenticationAssessment",
        "pathComparison",
        idx,
        "evidenceIds",
      ])
    );
    guide.prerequisites.forEach((pre, idx) =>
      checkRefs(pre.evidenceIds, ["prerequisites", idx, "evidenceIds"])
    );
    guide.setupSteps.forEach((step, idx) =>
      checkRefs(step.evidenceIds, ["setupSteps", idx, "evidenceIds"])
    );
    guide.painPoints.forEach((pp, idx) =>
      checkRefs(pp.evidenceIds, ["painPoints", idx, "evidenceIds"])
    );
    guide.scenario.alternativeScenarios?.forEach((alt, idx) =>
      checkRefs(alt.evidenceIds, [
        "scenario",
        "alternativeScenarios",
        idx,
        "evidenceIds",
      ])
    );

    // 3. Semantic honesty rule: if providerSupport is no_public_oauth_established or unknown_incomplete_research,
    // recommendedPath must NOT be register_custom_oauth_app or use_composio_managed_oauth
    if (
      (guide.authenticationAssessment.providerSupport ===
        "no_public_oauth_established" ||
        guide.authenticationAssessment.providerSupport ===
          "unknown_incomplete_research") &&
      (guide.authenticationAssessment.recommendedPath ===
        "register_custom_oauth_app" ||
        guide.authenticationAssessment.recommendedPath ===
          "use_composio_managed_oauth")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authenticationAssessment", "recommendedPath"],
        message: `Cannot recommend OAuth setup (${guide.authenticationAssessment.recommendedPath}) when providerSupport is ${guide.authenticationAssessment.providerSupport}`,
      });
    }

    // 4. Semantic honesty rule: if composioManagedAuth.status is unavailable or unknown,
    // recommendedPath must NOT be use_composio_managed_oauth
    if (
      (guide.authenticationAssessment.composioManagedAuth.status ===
        "unavailable" ||
        guide.authenticationAssessment.composioManagedAuth.status ===
          "unknown" ||
        guide.authenticationAssessment.composioManagedAuth.status ===
          "not_applicable") &&
      guide.authenticationAssessment.recommendedPath ===
        "use_composio_managed_oauth"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authenticationAssessment", "recommendedPath"],
        message: `Cannot recommend use_composio_managed_oauth when composioManagedAuth.status is ${guide.authenticationAssessment.composioManagedAuth.status}`,
      });
    }

    // 5. Security rule: ensure no raw secrets or tokens appear in instructions
    const secretPatterns = [
      /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{20,}/,
      /ghp_[a-zA-Z0-9]{36}/,
      /sk-[a-zA-Z0-9]{32,}/,
    ];
    for (const step of guide.setupSteps) {
      for (const rx of secretPatterns) {
        if (rx.test(step.instructions)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["setupSteps"],
            message: `Step "${step.id}" appears to contain an unredacted credential token`,
          });
        }
      }
    }
  });

export type Guide = z.infer<typeof GuideSchema>;
export type GuideOrigin = z.infer<typeof GuideOriginSchema>;
export type IntendedAudience = z.infer<typeof IntendedAudienceSchema>;
export type ProviderSupportStatus = z.infer<typeof ProviderSupportStatusSchema>;
export type ComposioManagedAuthStatus = z.infer<
  typeof ComposioManagedAuthStatusSchema
>;
export type RecommendedPath = z.infer<typeof RecommendedPathSchema>;
export type DifficultyCategory = z.infer<typeof DifficultyCategorySchema>;
export type SetupStep = z.infer<typeof SetupStepSchema>;
export type PainPoint = z.infer<typeof PainPointSchema>;
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type AgentResearchTrace = z.infer<typeof AgentResearchTraceSchema>;
export type OutcomeAndNextAction = z.infer<typeof OutcomeAndNextActionSchema>;
export type AlternativeScenarioMatrixItem = z.infer<
  typeof AlternativeScenarioMatrixItemSchema
>;

export function validateGuide(data: unknown): {
  success: boolean;
  data?: Guide;
  errors?: string[];
} {
  const parsed = GuideSchema.safeParse(data);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return {
    success: false,
    errors: parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`
    ),
  };
}
