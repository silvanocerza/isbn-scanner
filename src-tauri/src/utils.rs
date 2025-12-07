fn is_ean13(identifier: &str) -> bool {
    let digits: String = identifier.chars().filter(|c| c.is_numeric()).collect();
    if digits.len() != 13 {
        return false;
    }

    let mut sum = 0;
    for (i, ch) in digits[..12].chars().enumerate() {
        if let Ok(d) = ch.to_string().parse::<u32>() {
            sum += d * if i % 2 == 0 { 1 } else { 3 };
        }
    }

    let check_digit = (10 - (sum % 10)) % 10;
    if let Ok(d) = digits.chars().nth(12).unwrap().to_string().parse::<u32>() {
        d == check_digit
    } else {
        false
    }
}

pub fn get_identifier_type(identifier: &str) -> anyhow::Result<&'static str> {
    let digits: String = identifier.chars().filter(|c| c.is_numeric()).collect();

    match digits.len() {
        10 => Ok("ISBN_10"),
        13 => {
            if is_ean13(&digits) {
                Ok("EAN_13")
            } else {
                Ok("ISBN_13")
            }
        }
        _ => anyhow::bail!("Invalid identifier length"),
    }
}
