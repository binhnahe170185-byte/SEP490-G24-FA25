using System.Text.Json;
using System.Text.Json.Serialization;

namespace FJAP.Infrastructure.JsonConverters;

public class NullableDateOnlyJsonConverter : JsonConverter<DateOnly?>
{
    private const string DateFormat = "yyyy-MM-dd";

    public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        var value = reader.GetString();
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
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

    public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
    {
        if (value == null)
        {
            writer.WriteNullValue();
        }
        else
        {
            writer.WriteStringValue(value.Value.ToString(DateFormat));
        }
    }
}

