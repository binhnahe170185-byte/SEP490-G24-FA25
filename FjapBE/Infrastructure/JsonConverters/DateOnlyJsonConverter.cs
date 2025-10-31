using System.Text.Json;
using System.Text.Json.Serialization;

namespace FJAP.Infrastructure.JsonConverters;

public class DateOnlyJsonConverter : JsonConverter<DateOnly>
{
    private const string DateFormat = "yyyy-MM-dd";

    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        if (string.IsNullOrWhiteSpace(value))
        {
            return default;
        }

        if (DateOnly.TryParseExact(value, DateFormat, out var date))
        {
            return date;
        }

        // Try parsing with other common formats
        if (DateOnly.TryParse(value, out date))
        {
            return date;
        }

        throw new JsonException($"Unable to convert \"{value}\" to {nameof(DateOnly)}.");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString(DateFormat));
    }
}

