using System.Collections.Generic;

namespace Services.DTOs;

public class BoundingBoxDto
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
}

public class OcrWordDto
{
    public string Text { get; set; } = string.Empty;
    public BoundingBoxDto? BoundingBox { get; set; }
}

public class OcrLineDto
{
    public string Text { get; set; } = string.Empty;
    public BoundingBoxDto? BoundingBox { get; set; }
    public List<OcrWordDto> Words { get; set; } = new();

    public double? Y => BoundingBox?.Y;
    public double? Height => BoundingBox?.Height;
}

public class PageLinesDto
{
    public int PageNumber { get; set; }
    public List<OcrLineDto> Lines { get; set; } = new();
}

public class WordRefDto
{
    public string Text { get; set; } = string.Empty;
    public int CharStart { get; set; }
    public int CharEnd { get; set; }
}

public class DocumentBlockDto
{
    public string Type { get; set; } = "paragraph"; // "paragraph", "heading1", "heading2"
    public string Text { get; set; } = string.Empty;
    
    [System.Text.Json.Serialization.JsonIgnore]
    public List<OcrLineDto> Lines { get; set; } = new();
    
    public List<WordRefDto> Words { get; set; } = new();
}

public class PageBlocksDto
{
    public int PageNumber { get; set; }
    public List<DocumentBlockDto> Blocks { get; set; } = new();
}
