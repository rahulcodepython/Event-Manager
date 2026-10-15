package generic

// =====================================================================
// API Route Prefixes & Routing Paths
// =====================================================================
const (
    APIV1Prefix       = "/api/v1"
    RouteHealth       = "/health"
    RouteEvents       = "/events"
    RouteEventDates   = "/dates"
    RouteForms        = "/forms"
    RoutePublicApply  = "/public/apply"
    RouteApplicants   = "/applicants"
    RouteDevices      = "/devices"
    RouteAttendance   = "/attendance"
    RouteAnalysis     = "/analysis"
)

// =====================================================================
// Standard Error Codes
// =====================================================================
const (
    ErrCodeBadRequest      = "bad_request"
    ErrCodeNotFound        = "not_found"
    ErrCodeUnauthorized    = "unauthorized"
    ErrCodeForbidden       = "forbidden"
    ErrCodeConflict        = "conflict"
    ErrCodeInternal        = "internal_error"
    ErrCodePayloadTooLarge = "payload_too_large"
    ErrCodeUnprocessable   = "unprocessable_entity"
)

// =====================================================================
// Standard Error Messages
// =====================================================================
const (
    ErrMsgUnauthorized       = "missing or invalid authorization"
    ErrMsgForbidden          = "forbidden: insufficient permissions"
    ErrMsgInvalidRequest     = "invalid request body or query parameters"
    ErrMsgInvalidRequestBody = "Invalid request body."
    ErrMsgValidationFailed   = "Validation failed."
    ErrMsgTooManyRequests    = "too many requests, please try again later"
    ErrMsgInternal           = "internal server error"
    ErrMsgNotFound           = "Requested resource not found."
    ErrMsgRequestCanceled    = "Request was canceled."
    ErrMsgRequestTimeout     = "Request timed out."
    ErrMsgBodyEmpty          = "request body cannot be empty"
    ErrMsgInvalidJSON        = "invalid request body format"
)

// =====================================================================
// Standard Success Messages
// =====================================================================
const (
    MsgStatusOk          = "ok"
    MsgEventCreated      = "event created successfully"
    MsgEventUpdated      = "event updated successfully"
    MsgEventDeleted      = "event deleted successfully"
    MsgDatesSaved        = "event dates saved successfully"
    MsgFormCreated       = "form template created successfully"
    MsgFormUpdated       = "form template updated successfully"
    MsgFormLocked        = "event form locked successfully"
    MsgApplicantCreated  = "applicant created successfully"
    MsgApplicantDeleted  = "applicant deleted successfully"
    MsgDeviceVerified    = "device verified successfully"
    MsgEntryMarked       = "entry marked successfully"
    MsgExitMarked        = "exit marked successfully"
)

// =====================================================================
// HTTP Header Constants
// =====================================================================
const (
    HeaderAuthorization      = "Authorization"
    HeaderContentType        = "Content-Type"
    HeaderContentDisposition = "Content-Disposition"
    HeaderDeviceToken        = "X-Device-Token"
    HeaderXForwardedFor      = "X-Forwarded-For"
)

// =====================================================================
// Content-Type / MIME Constants
// =====================================================================
const (
    ContentTypeJSON = "application/json"
    ContentTypePDF  = "application/pdf"
    ContentTypeCSV  = "text/csv; charset=utf-8"
    ContentTypePNG  = "image/png"
    ContentTypeJPEG = "image/jpeg"
)

// =====================================================================
// Date and Time Layouts
// =====================================================================
const (
    DateFormat        = "2006-01-02"
    MonthFormat       = "2006-01"
    TimeFormat        = "15:04"
    DateTimeFormat    = "2006-01-02 15:04:05"
    CompactDateFormat = "20060102"
)

// =====================================================================
// Pagination Defaults & Limits
// =====================================================================
const (
    DefaultPage  = 1
    DefaultLimit = 30
    MaxLimit     = 100
    MaxPage      = 1_000_000_000
)

// =====================================================================
// Redis Key Formats & Rate Limiting Thresholds
// =====================================================================
const (
    RedisKeyVerifyLockout    = "rate:verify:lockout:%s"
    RedisKeyVerifyWindow     = "rate:verify:window:%s"
    RedisKeyVerifyFailures   = "rate:verify:failures:%s"
    RedisKeyWebAuthnSession  = "webauthn:session:%s"
    RedisKeyDeviceThrottle   = "device:active:throttle:%s"
    RedisKeyEventsList       = "cache:events:list:%s"
    RedisKeyEventsDetail     = "cache:events:detail:%s"
    RedisKeyDatesEvent       = "cache:dates:event:%s:%s"
    RedisKeyFormsList        = "cache:forms:list:%s"
    RedisKeyFormsDetail      = "cache:forms:detail:%s"
    RedisKeyEventForm        = "cache:event_form:event:%s"
    RedisKeyPublicApply      = "cache:public_apply:%s"
    RedisKeyApplicantsSchema = "cache:applicants:schema:%s"
    RedisKeyApplicantsList   = "cache:applicants:list:%s:%s"
    RedisKeyDevicesList      = "cache:devices:list:%s"
    RedisKeyDevicesToken     = "cache:devices:token:%s"
    RedisKeyEventDevices     = "cache:event_devices:event:%s"
    RedisKeyAnalysisMetrics  = "cache:analysis:metrics:%s:%s"
    RedisKeyAnalysisAttend   = "cache:analysis:attendees:%s:%s"

    MaxPINVerifyAttempts  = 5
    PINVerifyWindowSec    = 60
    PINLockoutDurationSec = 15 * 60
)

// =====================================================================
// Database Status Codes & Query Return Flags
// =====================================================================
const (
    StatusOk                 = "ok"
    StatusNotFound           = "not_found"
    StatusConflict           = "conflict"
    StatusEventEnded         = "event_ended"
    StatusDateOutOfRange     = "date_out_of_range"
    StatusDeviceUnauthorized = "device_unauthorized"
    StatusApplicantNotReg    = "applicant_not_registered"
    StatusNoEventDates       = "no_event_dates"
    StatusSessionEnded       = "session_ended"
    StatusAlreadyEntered     = "already_entered"
    StatusNotEnteredYet      = "not_entered_yet"
    StatusAlreadyExited      = "already_exited"
    StatusWaiting            = "waiting"
    StatusLive               = "live"
    StatusAttended           = "attended"
    StatusInside             = "inside"
    StatusNotAttended        = "not_attended"
    StatusAll                = "all"
)

// =====================================================================
// System Field Keys & Default Values
// =====================================================================
const (
    SystemFieldKeyName           = "name"
    SystemFieldKeyEmail          = "email"
    DefaultFieldIDName           = "field_default_name"
    DefaultFieldIDEmail          = "field_default_email"
    DefaultFieldLabelName        = "Full Name"
    DefaultFieldLabelEmail       = "Email Address"
    DefaultFieldPlaceholderName  = "Enter your full name"
    DefaultFieldPlaceholderEmail = "name@example.com"
    DefaultFormName              = "Event Registration Form"
    DefaultDeviceName            = "Web Scanner Device"
    DefaultWebAuthnDeviceName    = "WebAuthn Verified Device"
    DefaultFallbackScannerName   = "Scanner Terminal"
)

// =====================================================================
// Token & Session Identifier Prefixes
// =====================================================================
const (
    PrefixDeviceToken  = "dev_"
    PrefixRegSession   = "reg_"
    PrefixLoginSession = "login_"
    PrefixFingerprint  = "fp_"
)

// =====================================================================
// Form Source Types & Field Types
// =====================================================================
const (
    FormSourceTemplate = "template"
    FormSourceScratch  = "scratch"

    FieldTypeText     = "text"
    FieldTypeTextarea = "textarea"
    FieldTypeNumber   = "number"
    FieldTypeEmail    = "email"
    FieldTypePhone    = "phone"
    FieldTypeSelect   = "select"
    FieldTypeRadio    = "radio"
    FieldTypeCheckbox = "checkbox"
    FieldTypeDate     = "date"
    FieldTypeTime     = "time"
    FieldTypeMonth    = "month"
    FieldTypeWeek     = "week"
    FieldTypeFile     = "file"
    FieldTypeSwitch   = "switch"
)

// =====================================================================
// Feature keys referenced by code. Prices, options, names and limits are
// data in the features table; only these keys are fixed.
// =====================================================================
const (
    FeatureKeyApplicants = "applicants"
    FeatureKeyDuration   = "duration"
    FeatureKeyBranding   = "branding"
    FeatureKeySubEvents  = "sub_events"
    FeatureKeyBackupDays = "backup_days"
)
