using System;

namespace FAJP.Models
{
    public class Class
    {
        public string class_id { get; set; }
        public string class_name { get; set; }
        public string semester { get; set; }
        public DateTime? start_date { get; set; }
        public DateTime? end_date { get; set; }
        public string status { get; set; }
    }
}
