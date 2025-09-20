import Foundation

enum AppConfig {
    static let env: String = Bundle.main.infoDictionary?["APP_ENV"] as? String ?? "prod"
    static let serverBaseURL: String = Bundle.main.infoDictionary?["SERVER_BASE_URL"] as? String ?? ""
    static let billingStartAt: String = Bundle.main.infoDictionary?["BILLING_START_AT"] as? String ?? ""
    static let userPriceMonthly: Double = Double(Bundle.main.infoDictionary?["USER_PRICE_MONTHLY"] as? String ?? "1.99") ?? 1.99
    static let userPriceAnnual: Double = Double(Bundle.main.infoDictionary?["USER_PRICE_ANNUAL"] as? String ?? "18") ?? 18
    static let shopPriceMonthly: Double = Double(Bundle.main.infoDictionary?["SHOP_PRICE_MONTHLY"] as? String ?? "10") ?? 10
    static let shopPriceAnnual: Double = Double(Bundle.main.infoDictionary?["SHOP_PRICE_ANNUAL"] as? String ?? "90") ?? 90
    static let shopCommissionRate: Double = Double(Bundle.main.infoDictionary?["SHOP_COMMISSION_RATE"] as? String ?? "0.03") ?? 0.03
    static let loyaltyMonths: Int = Int(Bundle.main.infoDictionary?["LOYALTY_DISCOUNT_MONTHS"] as? String ?? "3") ?? 3
    static let loyaltyRate: Double = Double(Bundle.main.infoDictionary?["LOYALTY_DISCOUNT_RATE"] as? String ?? "0.5") ?? 0.5
}
