using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;

namespace Repositories;

public class DocumentRepository : IDocumentRepository
{
    private readonly AppDbContext _db;

    public DocumentRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Document> CreateAsync(Document document)
    {
        _db.Documents.Add(document);
        await _db.SaveChangesAsync();
        return document;
    }

    public async Task<Document?> GetByIdAsync(long id)
    {
        return await _db.Documents.FindAsync(id);
    }

    public async Task<Document> UpdateAsync(Document document)
    {
        _db.Documents.Update(document);
        await _db.SaveChangesAsync();
        return document;
    }

    public async Task<IEnumerable<Document>> GetByUserIdAsync(long userId)
    {
        return await _db.Documents
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();
    }
}
