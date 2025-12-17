using System.Collections.Generic;

namespace FJAP.DTOs
{
    public class DashboardChartDataDto
    {
        public List<ChartSeriesDto> PassRateBySemester { get; set; } = new List<ChartSeriesDto>();
        public List<ChartSeriesDto> AttendanceRateBySemester { get; set; } = new List<ChartSeriesDto>();
        public List<ChartSeriesDto> AverageScoreBySemester { get; set; } = new List<ChartSeriesDto>();
    }

    public class ChartSeriesDto
    {
        public string Name { get; set; } = string.Empty;
        public double Value { get; set; }
        public string? ExtraInfo { get; set; }
    }
}
