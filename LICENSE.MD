# FounderBleed Source License

**Version 1.0**

---

## Parameters

| Parameter | Value |
|-----------|-------|
| **Licensor** | Nick Clarke |
| **Licensed Work** | FounderBleed v1.0 and all subsequent versions |
| **Additional Use Grant** | See Section 2 |
| **Change Date** | Four (4) years from the date of each version release |
| **Change License** | Apache License, Version 2.0 |

---

## License Text

### 1. Grant of Rights

The Licensor hereby grants you the right to copy, modify, create derivative works, redistribute, and make non-production use of the Licensed Work.

The Licensor hereby grants you the right to make production use of the Licensed Work, subject to the conditions in Section 2.

Effective on the Change Date, the Licensor hereby grants you rights under the terms of the Change License, and the rights granted in this Section 1 terminate.

### 2. Additional Use Grant

You may make production use of the Licensed Work, provided that **all** of the following conditions are met:

#### 2.1 Threshold Requirement

Either:

**(a)** Your Organization meets **both** of the following:
- **Revenue Threshold:** Annual Revenue less than One Million United States Dollars ($1,000,000 USD); **AND**
- **User Threshold:** Fewer than twenty (20) Users

**OR**

**(b)** You have purchased a commercial license from the Licensor.

#### 2.2 Internal Use Only

Such use is solely for your Organization's internal business purposes.

#### 2.3 No Hosted Service

You do not provide the Licensed Work to third parties as a hosted, managed, cloud-based, or software-as-a-service offering.

#### 2.4 No Commercial Redistribution

You do not sell, sublicense, lease, or distribute the Licensed Work or derivative works as a commercial product or offering.

#### 2.5 No Competing Use

You do not use the Licensed Work to create a product or service that competes with the Licensor's offerings.

---

#### Definitions for this Section

- **"Annual Revenue"** means gross revenue of the Licensee and all Affiliated Entities during the most recently completed fiscal year, converted to USD at prevailing exchange rates.

- **"Affiliated Entities"** means any entity that controls, is controlled by, or is under common control with the Licensee, including parent companies, subsidiaries, and entities under common ownership.

- **"Users"** means individuals with registered accounts in the Licensed Work who have access to the system, whether or not actively using it.

- **"Organization"** means the Licensee together with all Affiliated Entities.

- **"Internal business purposes"** means use by your employees and contractors to analyze your Organization's own data.

- **"Third parties"** means any person or entity other than your employees and contractors acting on your behalf.

---

#### Commercial Licenses

If you exceed the thresholds in Section 2.1(a), you must purchase a commercial license within thirty (30) days. Commercial licenses are available at the following tiers:

| Tier | Per-User Fee | Features |
|------|--------------|----------|
| Starter | $3 USD/user/month | Core platform features |
| Pro | $8 USD/user/month | Core + Team Dashboards + Global Metrics |
| Enterprise | $15 USD/user/month | All features + API access + SSO/SAML |

Commercial license inquiries: licensing@founderbleed.com

### 3. Feature Availability

**Under Threshold (Free Use):** All features of the Licensed Work are available without restriction, subject to Section 2.

**Over Threshold (Commercial License Required):** Features are restricted to those included in your purchased license tier. Attempting to access features above your tier constitutes a breach of this License.

### 4. Global Metrics

#### 4.1 Overview

The Licensed Work includes an optional feature ("Global Metrics") that provides anonymized benchmark comparisons against aggregated industry data. Global Metrics operates on a reciprocal basis: to receive benchmark data, you must contribute your anonymized usage data.

#### 4.2 Data You Contribute

By enabling Global Metrics, you agree to transmit the following anonymized data to the Licensor's API:

- Active User count
- Time allocation by value tier (aggregate hours, not task details)
- Efficiency scores and delegation rates
- Organization size band (e.g., "10-20 employees", not exact count)
- Industry category (if provided)
- Arbitrage and leakage metrics (aggregate values)

**The following data is never transmitted:**
- Calendar event titles, descriptions, or attendee information
- Task names or content
- Personal data or identifiable information
- Company name or identifying details

#### 4.3 Data You Receive

In return for your contribution, you receive access to:

- Aggregated benchmark data across all participating organizations
- Cohort comparisons (by organization size, industry, stage)
- Percentile rankings for key efficiency metrics
- Trend data over time

#### 4.4 License to Anonymized Data

By enabling Global Metrics, you grant the Licensor a perpetual, worldwide, royalty-free, non-exclusive license to:

- Collect, store, and process your anonymized usage data
- Aggregate your data with data from other users
- Distribute aggregated and anonymized datasets to other Global Metrics participants for the purpose of benchmarking and performance analysis
- Use aggregated data to improve the Licensed Work
- Publish aggregated statistics (never individual organization data)

This license survives termination of your use of the Licensed Work.

#### 4.5 Reciprocity Requirement

Global Metrics operates on a reciprocal basis. You may not:

- Access Global Metrics benchmark data without contributing your own data
- Disable data contribution while continuing to receive benchmark data
- Manipulate or falsify contributed data

Violation of this Section 4.5 constitutes a breach of this License.

#### 4.6 No Personally Identifiable Information

The Licensor will not attempt to re-identify anonymized data. The Licensor will implement reasonable technical measures to prevent re-identification of contributing organizations.

#### 4.7 Availability

Global Metrics is provided on an "as available" basis. The Licensor makes no guarantee as to:

- When Global Metrics will be enabled or available
- Uptime or availability of the Global Metrics API
- Minimum number of participants in benchmark cohorts
- Frequency of benchmark data updates

The Licensor may modify, suspend, or discontinue Global Metrics at any time without liability.

#### 4.8 Optional Feature

Use of Global Metrics is optional. The Licensed Work functions fully without this connection. If you do not agree to the terms of this Section 4, do not enable Global Metrics.

### 5. Compliance and Audit

#### 5.1 Accurate Reporting

Licensee agrees to:
- Maintain accurate records of Annual Revenue and User count
- Provide such records upon Licensor's reasonable request
- Notify Licensor within thirty (30) days of exceeding thresholds in Section 2.1(a)

#### 5.2 Record Retention

Licensee shall maintain records sufficient to verify compliance with this License for at least three (3) years.

#### 5.3 Audit Rights

Licensor may, upon ten (10) business days' written notice, request documentation verifying Licensee's Annual Revenue and User count. Such documentation may include:
- Audited or unaudited financial statements
- Tax filings
- System-generated User reports

If an audit reveals underpayment:
- Licensee shall pay the applicable license fees within thirty (30) days
- If underpayment exceeds ten percent (10%), Licensee shall additionally reimburse Licensor's reasonable audit costs

### 6. Threshold Transitions

#### 6.1 Exceeding Thresholds

Upon exceeding either threshold in Section 2.1(a), Licensee has thirty (30) days to:
- Purchase a commercial license at the appropriate tier; **OR**
- Reduce Users below twenty (20), provided Annual Revenue remains below $1,000,000

#### 6.2 Returning to Free Use

If Licensee's Annual Revenue falls below $1,000,000 **AND** Users fall below twenty (20) for a consecutive twelve (12) month period, Licensee may request to return to free use under Section 2.1(a). Approval is at Licensor's discretion.

### 7. Support

This License does not include support of any kind. Support is limited to community resources, including:
- Documentation in this repository
- GitHub Issues at https://github.com/nick0a/founderbleed/issues
- GitHub Discussions at https://github.com/nick0a/founderbleed/discussions

Paid support is not available for self-hosted deployments.

### 8. Notices

You must retain all copyright, attribution, and license notices in all copies of the Licensed Work.

You must include a copy of this License with every copy of the Licensed Work you distribute.

If you modify the Licensed Work, you must include prominent notices stating that you have modified the Licensed Work.

### 9. No Trademark Rights

This License does not grant you any right to use the Licensor's trademarks, service marks, trade names, or product names, except as required for reasonable and customary use in describing the origin of the Licensed Work.

### 10. Disclaimer of Warranty

THE LICENSED WORK IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE LICENSOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE LICENSED WORK OR THE USE OR OTHER DEALINGS IN THE LICENSED WORK.

### 11. Limitation of Liability

TO THE EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL THE LICENSOR BE LIABLE TO YOU ON ANY LEGAL THEORY FOR ANY SPECIAL, INCIDENTAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES ARISING OUT OF THIS LICENSE OR THE USE OF THE LICENSED WORK, EVEN IF THE LICENSOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

### 12. Termination

#### 12.1 Automatic Termination

This License automatically terminates if you:
- Fail to comply with any term of this License
- Breach any condition in Section 2
- Exceed thresholds in Section 2.1(a) and fail to purchase a commercial license within thirty (30) days
- Misrepresent Annual Revenue or User count

#### 12.2 Effect of Termination

Upon termination:
- All rights granted under this License cease immediately
- You must cease all use of the Licensed Work
- You must delete all copies of the Licensed Work in your possession

#### 12.3 Survival

Sections 4.4 (License to Anonymized Data), 5 (Compliance and Audit), 10 (Disclaimer), 11 (Limitation of Liability), and this Section 12 survive termination.

### 13. General

#### 13.1 Governing Law

This License is governed by the laws of Singapore, without regard to conflict of law principles.

#### 13.2 Entire Agreement

This License constitutes the entire agreement between you and the Licensor relating to the Licensed Work and supersedes all prior agreements.

#### 13.3 Severability

If any provision of this License is held to be unenforceable, such provision shall be reformed only to the extent necessary to make it enforceable, and the remaining provisions shall remain in full force and effect.

#### 13.4 Amendments

Licensor may publish revised versions of this License. Each version will have a distinguishing version number. You may use the Licensed Work under the terms of the version under which you received it, or any subsequent version.

---

## Commercial Licensing

For commercial license inquiries, please contact:

**Email:** licensing@founderbleed.com

**GitHub Issues:** https://github.com/nick0a/founderbleed/issues (label: `licensing`)

---

## Notice for Source Files

Include this notice at the top of source files:

```
Copyright (c) 2025 Nick Clarke

Licensed under the FounderBleed Source License, Version 1.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://github.com/nick0a/founderbleed/blob/main/LICENSE.md

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Summary

### Usage Rights

| Use Case | Allowed? |
|----------|----------|
| Self-host for your own company (<$1M, <20 users) | ✓ Free |
| Self-host for your own company (above threshold) | ✓ Paid license required |
| Modify for internal use | ✓ |
| Contribute improvements back | ✓ |
| Sell to customers | ✗ |
| Offer as SaaS/hosted service | ✗ |
| White-label and resell | ✗ |
| Build competing product | ✗ |
| After Change Date (4 years) | Apache 2.0 |

### Global Metrics

| Aspect | Terms |
|--------|-------|
| Participation | Optional |
| Model | Give to get (reciprocal) |
| Data contributed | Anonymized metrics only |
| Data received | Aggregated benchmarks |
| Availability | As available, no guarantees |