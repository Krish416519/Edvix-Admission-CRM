# Eligibility Engine Edge Cases Test Results

## Test Case 1. Missing Education Data (Requires Graduation)
- **Overall Status**: `INSUFFICIENT_DATA`
- **Lead Profile**: `{"id":"l1"}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":0,"allowBacklogsWithManualReview":false}`
### Rules Evaluated:
- **Graduation Degree** [INSUFFICIENT_DATA]: Education history is missing.
- **Minimum Percentage** [INSUFFICIENT_DATA]: Minimum 50% required, but student score is not recorded.
- **Backlog Status** [INSUFFICIENT_DATA]: Backlog information is missing.

---

## Test Case 2. Undergrad applying for PG (12th Pass, Requires Graduation)
- **Overall Status**: `NOT_ELIGIBLE`
- **Lead Profile**: `{"id":"l2","education":"12th Pass","twelfthPercentage":80}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":0,"allowBacklogsWithManualReview":false}`
### Rules Evaluated:
- **Graduation Degree** [FAIL]: Requires a Bachelor's degree.
- **Minimum Percentage** [INSUFFICIENT_DATA]: Minimum 50% required, but student score is not recorded.
- **Backlog Status** [INSUFFICIENT_DATA]: Backlog information is missing.

---

## Test Case 3. Graduate with 45%, Program requires 50%
- **Overall Status**: `NOT_ELIGIBLE`
- **Lead Profile**: `{"id":"l3","education":"Graduate","graduationPercentage":45}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":0,"allowBacklogsWithManualReview":false}`
### Rules Evaluated:
- **Graduation Degree** [PASS]: Graduation requirement met.
- **Minimum Percentage** [FAIL]: Score of 45% is below the required 50%.
- **Backlog Status** [INSUFFICIENT_DATA]: Backlog information is missing.

---

## Test Case 4. Graduate with exactly 50%, Program requires 50%
- **Overall Status**: `VERIFIED_ELIGIBLE`
- **Lead Profile**: `{"id":"l4","education":"Graduate","graduationPercentage":50,"graduationBacklogs":0}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":0,"allowBacklogsWithManualReview":false}`
### Rules Evaluated:
- **Graduation Degree** [PASS]: Graduation requirement met.
- **Minimum Percentage** [PASS]: Score of 50% meets the 50% requirement.
- **Backlog Status** [PASS]: No backlogs reported.

---

## Test Case 5. Graduate with Backlogs undefined, Program requires Backlogs check
- **Overall Status**: `INSUFFICIENT_DATA`
- **Lead Profile**: `{"id":"l5","education":"Graduate","graduationPercentage":60}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":0,"allowBacklogsWithManualReview":false}`
### Rules Evaluated:
- **Graduation Degree** [PASS]: Graduation requirement met.
- **Minimum Percentage** [PASS]: Score of 60% meets the 50% requirement.
- **Backlog Status** [INSUFFICIENT_DATA]: Backlog information is missing.

---

## Test Case 6. Graduate with 2 backlogs, Program allows 0
- **Overall Status**: `NOT_ELIGIBLE`
- **Lead Profile**: `{"id":"l6","education":"Graduate","graduationPercentage":60,"graduationBacklogs":2}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":0,"allowBacklogsWithManualReview":false}`
### Rules Evaluated:
- **Graduation Degree** [PASS]: Graduation requirement met.
- **Minimum Percentage** [PASS]: Score of 60% meets the 50% requirement.
- **Backlog Status** [FAIL]: Backlogs are not allowed for this program.

---

## Test Case 7. Graduate with 2 backlogs, Program allows 1 but has manual review flag
- **Overall Status**: `MANUAL_REVIEW`
- **Lead Profile**: `{"id":"l7","education":"Graduate","graduationPercentage":60,"graduationBacklogs":2}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":1,"allowBacklogsWithManualReview":true}`
### Rules Evaluated:
- **Graduation Degree** [PASS]: Graduation requirement met.
- **Minimum Percentage** [PASS]: Score of 60% meets the 50% requirement.
- **Backlog Status** [MANUAL_REVIEW]: Backlogs require manual verification with the university.

---

## Test Case 8. Graduate with 1 backlog, Program allows 1 with manual review flag
- **Overall Status**: `VERIFIED_ELIGIBLE`
- **Lead Profile**: `{"id":"l8","education":"Graduate","graduationPercentage":60,"graduationBacklogs":1}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":1,"allowBacklogsWithManualReview":true}`
### Rules Evaluated:
- **Graduation Degree** [PASS]: Graduation requirement met.
- **Minimum Percentage** [PASS]: Score of 60% meets the 50% requirement.
- **Backlog Status** [PASS]: Student has 1 backlogs, which is within the allowed limit of 1.

---

## Test Case 9. 12th Pass checking non-grad program (Requires 45%, got 40%)
- **Overall Status**: `NOT_ELIGIBLE`
- **Lead Profile**: `{"id":"l9","education":"12th Pass","twelfthPercentage":40}`
- **Rule Conditions**: `{"requiresGraduation":false,"minimumPercentage":45}`
### Rules Evaluated:
- **Minimum Percentage** [FAIL]: Score of 40% is below the required 45%.

---

## Test Case 10. Valid profile meeting all requirements (65%, 0 backlogs)
- **Overall Status**: `VERIFIED_ELIGIBLE`
- **Lead Profile**: `{"id":"l10","education":"Graduate","graduationPercentage":65,"graduationBacklogs":0}`
- **Rule Conditions**: `{"requiresGraduation":true,"minimumPercentage":50,"checkBacklogs":true,"allowedBacklogs":0,"allowBacklogsWithManualReview":false}`
### Rules Evaluated:
- **Graduation Degree** [PASS]: Graduation requirement met.
- **Minimum Percentage** [PASS]: Score of 65% meets the 50% requirement.
- **Backlog Status** [PASS]: No backlogs reported.

---

